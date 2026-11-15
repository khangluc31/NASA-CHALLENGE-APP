
from pathlib import Path

from co2_extractor import CO2Extractor
from extractor import NightLightsExtractor, OceanExtractor
from video_loader import load_topics, PROCESSED_DIR


# =====================================================
# PATH CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

# Ocean
OCEAN_COLORBAR_PATH = (
    PROJECT_DIR
    / "DATA"
    / "raw"
    / "ocean"
    / "sst_ecco2_cbar.png"
)

# CO2
CO2_DIR = PROJECT_DIR / "DATA" / "raw" / "co2"

CO2_VIDEO_PATH = CO2_DIR / "co2.mp4"

CO2_COLORBAR_PATH = (
    CO2_DIR
    / "dyamondCbar_6-27-2024a.png"
)


# =====================================================
# EXTRACTOR CONFIGURATION
# =====================================================

def build_topic_extractors():

    return {
        "night_lights": NightLightsExtractor(),

        "ocean": OceanExtractor(
            sample_step=1,
            warm_threshold=25.0,
            cold_threshold=10.0,
            color_distance_threshold=25.0
        )
    }


# =====================================================
# PROCESS STANDARD TOPICS
# =====================================================

def process_standard_topics(extractor_map):

    all_topics = load_topics()

    # Only process Night Lights and Ocean
    topics = [
        source
        for source in all_topics
        if source.topic.lower() in extractor_map
    ]

    PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    for source in topics:

        topic = source.topic.lower()

        print(f"\n[INFO] Processing topic: {topic}")

        extractor = extractor_map[topic]

        output_dir = PROCESSED_DIR / topic

        output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        try:

            # -----------------------------------------
            # NIGHT LIGHTS
            # -----------------------------------------

            if topic == "night_lights":

                output_file = extractor.process(
                    source,
                    output_dir
                )

            # -----------------------------------------
            # OCEAN
            # -----------------------------------------

            elif topic == "ocean":

                if not source.videos:
                    raise ValueError(
                        "No video found for Ocean"
                    )

                if not OCEAN_COLORBAR_PATH.is_file():
                    raise FileNotFoundError(
                        f"Ocean colorbar not found: "
                        f"{OCEAN_COLORBAR_PATH}"
                    )

                video_path = source.videos[0]

                extractor.process(
                    video_path=video_path,
                    colorbar_path=OCEAN_COLORBAR_PATH,
                    output_dir=output_dir
                )

                output_file = output_dir / "ocean.json"

            print(f"[SUCCESS] {topic}")
            print(f"[OUTPUT] {output_file}")

        except Exception as error:

            print(f"[ERROR] {topic}: {error}")

            raise


# =====================================================
# PROCESS CO2 SEPARATELY
# =====================================================

def process_co2():

    print("\n[INFO] Processing standalone topic: co2")

    if not CO2_VIDEO_PATH.is_file():
        raise FileNotFoundError(
            f"CO2 video not found: {CO2_VIDEO_PATH}"
        )

    if not CO2_COLORBAR_PATH.is_file():
        raise FileNotFoundError(
            f"CO2 colorbar not found: {CO2_COLORBAR_PATH}"
        )

    output_dir = PROCESSED_DIR / "co2"

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    extractor = CO2Extractor(
        processing_width=480,
        lab_levels=32,
        color_distance_threshold=38.0,
        min_saturation=8,
        min_value=18,
        min_valid_pixels=30,
        save_debug=True
    )

    try:

        output_file = extractor.process(
            video_path=CO2_VIDEO_PATH,
            colorbar_path=CO2_COLORBAR_PATH,
            output_dir=output_dir
        )

        print("[SUCCESS] co2")
        print(f"[OUTPUT] {output_file}")

    except Exception as error:

        print(f"[ERROR] co2: {error}")

        raise


# =====================================================
# MAIN
# =====================================================

def main():

    PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    extractor_map = build_topic_extractors()

    # 1. Night Lights and Ocean
    process_standard_topics(extractor_map)

    # 2. CO2
    process_co2()


if __name__ == "__main__":
    main()

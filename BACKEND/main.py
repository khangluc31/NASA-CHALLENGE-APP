
from pathlib import Path

from video_loader import load_topics, PROCESSED_DIR

from extractor import (
    NightLightsExtractor,
    OceanExtractor
)


# =====================================================
# CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent

PROJECT_DIR = BASE_DIR.parent

COLORBAR_PATH = (
    PROJECT_DIR
    / "DATA"
    / "raw"
    / "ocean"
    / "sst_ecco2_cbar.png"
)


# =====================================================
# MAIN
# =====================================================

def main():

    # Mapping topic -> extractor
    extractor_map = {
        "night_lights": NightLightsExtractor(),

        "ocean": OceanExtractor(
            sample_step=1,
            warm_threshold=25.0,
            cold_threshold=10.0,
            color_distance_threshold=25.0
        )
    }

    # Load all topics from DATA/raw
    topics = load_topics()

    # Create processed directory
    PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    for source in topics:

        topic = source.topic.lower()

        print(f"\n[INFO] Processing topic: {topic}")

        extractor = extractor_map.get(topic)

        if extractor is None:
            print(f"[SKIP] No extractor found for topic: {topic}")
            continue

        # Separate output directory for each topic
        output_dir = PROCESSED_DIR / topic

        output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        try:

            # -----------------------------------------
            # Night Lights
            # -----------------------------------------

            if topic == "night_lights":

                output_file = extractor.process(
                    source,
                    output_dir
                )

            # -----------------------------------------
            # Ocean
            # -----------------------------------------

            elif topic == "ocean":

                if not source.videos:
                    raise ValueError(
                        "No video found for Ocean"
                    )

                if not COLORBAR_PATH.exists():
                    raise FileNotFoundError(
                        f"Colorbar not found: {COLORBAR_PATH}"
                    )

                video_path = source.videos[0]

                extractor.process(
                    video_path=video_path,
                    colorbar_path=COLORBAR_PATH,
                    output_dir=output_dir
                )

                output_file = output_dir / "ocean.json"

            print(f"[SUCCESS] {topic}")
            print(f"[OUTPUT] {output_file}")

        except Exception as e:

            print(f"[ERROR] {topic}: {e}")

            raise


if __name__ == "__main__":
    main()

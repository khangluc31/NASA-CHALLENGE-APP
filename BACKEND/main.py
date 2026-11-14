
from pathlib import Path

from video_loader import load_topics, PROCESSED_DIR
from extractor import (
    NightLightsExtractor,
    CO2Extractor,
    OceanExtractor
)


def main():
    # Mapping topic -> extractor
    extractor_map = {
        "night_lights": NightLightsExtractor(),
        "co2": CO2Extractor(),
        "ocean": OceanExtractor()
    }

    # Load tất cả topic từ DATA/raw
    topics = load_topics()

    # Tạo thư mục processed
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    for source in topics:
        topic = source.topic.lower()

        print(f"\n[INFO] Processing topic: {topic}")

        extractor = extractor_map.get(topic)

        if extractor is None:
            print(f"[SKIP] No extractor found for topic: {topic}")
            continue

        # Thư mục output riêng cho từng topic
        output_dir = PROCESSED_DIR / topic
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            output_file = extractor.process(source, output_dir)

            print(f"[SUCCESS] {topic}")
            print(f"[OUTPUT] {output_file}")

        except Exception as e:
            print(f"[ERROR] {topic}: {e}")
            raise


if __name__ == "__main__":
    main()

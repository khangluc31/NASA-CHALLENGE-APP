
from pathlib import Path
from dataclasses import dataclass, field
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "DATA" / "raw"
PROCESSED_DIR = BASE_DIR / "DATA" / "processed"

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm"}


@dataclass
class TopicSource:
    topic: str
    folder: Path
    meta: dict
    videos: list[Path] = field(default_factory=list)
    frames_dir: Path | None = None
    colorbar: Path | None = None


def load_topics(raw_dir: Path = RAW_DIR) -> list[TopicSource]:
    if not raw_dir.is_dir():
        raise FileNotFoundError(
            f"Không tìm thấy thư mục: {raw_dir}"
        )

    topics = []

    for folder in sorted(p for p in raw_dir.iterdir() if p.is_dir()):

        # ----------------------------------
        # 1. Load YAML if available
        # ----------------------------------
        meta_file = folder / "meta.yaml"

        if meta_file.exists():
            meta = yaml.safe_load(
                meta_file.read_text(encoding="utf-8")
            ) or {}

            print(f"[INFO] Loaded metadata: {folder.name}")

        else:
            meta = {}
            print(
                f"[WARNING] {folder.name}: "
                "missing meta.yaml, using default config"
            )

        # ----------------------------------
        # 2. Detect videos
        # ----------------------------------
        videos = sorted(
            p for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in VIDEO_EXTS
        )

        # ----------------------------------
        # 3. Detect frames directory
        # ----------------------------------
        frames_path = folder / "frames"

        frames_dir = (
            frames_path
            if frames_path.is_dir()
            else None
        )

        # ----------------------------------
        # 4. Detect colorbar
        # ----------------------------------
        colorbar_name = meta.get("colorbar")

        colorbar = (
            folder / colorbar_name
            if colorbar_name
            else None
        )

        # ----------------------------------
        # 5. Create TopicSource
        # ----------------------------------
        src = TopicSource(
            topic=meta.get("topic", folder.name).lower(),
            folder=folder,
            meta=meta,
            videos=videos,
            frames_dir=frames_dir,
            colorbar=colorbar,
        )

        # ----------------------------------
        # 6. Validate input data
        # ----------------------------------
        if not src.videos and not src.frames_dir:
            print(
                f"[SKIP] {folder.name}: "
                "no video or frames/"
            )
            continue

        if colorbar is not None and not colorbar.is_file():
            raise FileNotFoundError(
                f"Colorbar not found: {colorbar}"
            )

        topics.append(src)

    if not topics:
        raise FileNotFoundError(
            f"Không có chủ đề hợp lệ trong {raw_dir}"
        )

    return topics


if __name__ == "__main__":
    for t in load_topics():
        print(
            t.topic,
            "| videos:", [v.name for v in t.videos],
            "| frames:", bool(t.frames_dir),
            "| colorbar:", t.colorbar,
            "| extractors:", t.meta.get("extractors", [])
        )

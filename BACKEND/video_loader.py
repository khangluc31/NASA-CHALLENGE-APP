from pathlib import Path
from dataclasses import dataclass, field
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "DATA" / "raw"
PROCESSED_DIR = BASE_DIR / "DATA" / "processed"
VIDEO_EXTS = {".mp4", ".mov", ".mkv"}


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
        raise FileNotFoundError(f"Không tìm thấy thư mục: {raw_dir}")

    topics = []
    for folder in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        meta_file = folder / "meta.yaml"
        if not meta_file.exists():
            print(f"[skip] {folder.name}: thiếu meta.yaml")
            continue

        meta = yaml.safe_load(meta_file.read_text(encoding="utf-8"))
        videos = sorted(p for p in folder.iterdir()
                        if p.suffix.lower() in VIDEO_EXTS)
        frames_dir = folder / "frames"
        cb = meta.get("colorbar")

        src = TopicSource(
            topic=meta.get("topic", folder.name),
            folder=folder,
            meta=meta,
            videos=videos,
            frames_dir=frames_dir if frames_dir.is_dir() else None,
            colorbar=folder / cb if cb else None,
        )
        if not src.videos and not src.frames_dir:
            print(f"[skip] {folder.name}: không có video hoặc frames/")
            continue
        topics.append(src)

    if not topics:
        raise FileNotFoundError(f"Không có chủ đề hợp lệ trong {raw_dir}")
    return topics


if __name__ == "__main__":
    for t in load_topics():
        print(t.topic, "| videos:", [v.name for v in t.videos],
              "| frames:", bool(t.frames_dir), "| extractors:", t.meta["extractors"])
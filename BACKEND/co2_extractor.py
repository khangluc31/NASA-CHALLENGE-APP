from __future__ import annotations
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import cv2
import numpy as np
class CO2Extractor:
    COLORBAR_X_MIN = 250
    COLORBAR_X_MAX = 1666
    COLORBAR_Y_MIN = 323
    COLORBAR_Y_MAX = 535
    PPM_MIN = 380.0
    PPM_MAX = 460.0
    START_SIMULATION_TIME = datetime(2020, 1, 14, 22, 0, 0)
    SIMULATION_HOURS_PER_FRAME = 1
    def __init__(self,processing_width: int = 480,lab_levels: int = 32,color_distance_threshold: float = 38.0,min_saturation: int = 8,min_value: int = 18,min_valid_pixels: int = 30,save_debug: bool = True,):
        if processing_width <= 0:
            raise ValueError("processing_width must be positive")
        if lab_levels < 8 or lab_levels > 64:
            raise ValueError("lab_levels must be between 8 and 64")
        self.processing_width = processing_width
        self.lab_levels = lab_levels
        self.color_distance_threshold = color_distance_threshold
        self.min_saturation = min_saturation
        self.min_value = min_value
        self.min_valid_pixels = min_valid_pixels
        self.save_debug = save_debug
    def build_color_palette(self, colorbar_path: Path, sample_count: int = 256):
        colorbar = cv2.imread(str(colorbar_path), cv2.IMREAD_UNCHANGED)
        if colorbar is None:
            raise FileNotFoundError(f"Cannot read colorbar: {colorbar_path}")
        if colorbar.ndim != 3 or colorbar.shape[2] not in (3, 4):
            raise ValueError(
                f"Unsupported colorbar shape: {colorbar.shape}. "
                "Expected BGR or BGRA image."
            )
        height, width = colorbar.shape[:2]
        if width <= self.COLORBAR_X_MAX or height <= self.COLORBAR_Y_MAX:
            raise ValueError(
                "Colorbar dimensions do not match the supplied NASA image. "
                f"Got {width}x{height}."
            )
        bgr = colorbar[:, :, :3]
        if colorbar.shape[2] == 4:
            alpha = colorbar[:, :, 3]
        else:
            alpha = np.full((height, width), 255, dtype=np.uint8)
        x_positions = np.linspace(
            self.COLORBAR_X_MIN,
            self.COLORBAR_X_MAX,
            sample_count,
        ).astype(int)

        y0 = self.COLORBAR_Y_MIN
        y1 = self.COLORBAR_Y_MAX

        palette = np.zeros((sample_count, 3), dtype=np.uint8)

        for i, x in enumerate(x_positions):
            column = bgr[y0:y1, x]
            alpha_column = alpha[y0:y1, x]
            visible = column[alpha_column > 0]

            if visible.size == 0:
                raise ValueError(
                    f"No visible colorbar pixels at x={x}. "
                    "Check the colorbar ROI coordinates."
                )
            palette[i] = np.median(visible, axis=0).astype(np.uint8)
        ppm_values = np.linspace(self.PPM_MIN, self.PPM_MAX, sample_count)
        return palette, ppm_values
    def build_lab_lookup(self, palette_bgr: np.ndarray):
        palette_image = palette_bgr.reshape(1, -1, 3)
        palette_lab = cv2.cvtColor(
            palette_image,
            cv2.COLOR_BGR2LAB,
        ).reshape(-1, 3).astype(np.float32)
        levels = self.lab_levels
        axis = np.linspace(0, 255, levels, dtype=np.float32)
        grid = np.stack(
            np.meshgrid(axis, axis, axis, indexing="ij"),
            axis=-1,
        ).reshape(-1, 3)
        nearest_index = np.empty(len(grid), dtype=np.uint8)
        nearest_distance = np.empty(len(grid), dtype=np.float32)
        chunk_size = 1024
        for start in range(0, len(grid), chunk_size):
            end = min(start + chunk_size, len(grid))
            block = grid[start:end]
            difference = block[:, None, :] - palette_lab[None, :, :]
            distance_squared = np.sum(difference * difference, axis=2)
            indices = np.argmin(distance_squared, axis=1)
            nearest_index[start:end] = indices.astype(np.uint8)
            nearest_distance[start:end] = np.sqrt(
                distance_squared[np.arange(len(block)), indices]
            )

        return (
            nearest_index.reshape(levels, levels, levels),
            nearest_distance.reshape(levels, levels, levels),
        )
    def process_frame(
        self,
        frame: np.ndarray,
        index_lut: np.ndarray,
        distance_lut: np.ndarray,
    ):
        original_height, original_width = frame.shape[:2]

        if original_width > self.processing_width:
            new_height = max(
                1,
                round(original_height * self.processing_width / original_width),
            )
            frame_small = cv2.resize(
                frame,
                (self.processing_width, new_height),
                interpolation=cv2.INTER_AREA,
            )
        else:
            frame_small = frame
        lab = cv2.cvtColor(frame_small, cv2.COLOR_BGR2LAB)
        hsv = cv2.cvtColor(frame_small, cv2.COLOR_BGR2HSV)
        bins = (
            lab.astype(np.uint16) * self.lab_levels // 256
        ).clip(0, self.lab_levels - 1)
        l_bin = bins[:, :, 0]
        a_bin = bins[:, :, 1]
        b_bin = bins[:, :, 2]
        palette_indices = index_lut[l_bin, a_bin, b_bin]
        color_distances = distance_lut[l_bin, a_bin, b_bin]
        saturation = hsv[:, :, 1]
        brightness = hsv[:, :, 2]
        valid_mask = (
            (color_distances <= self.color_distance_threshold)
            & (saturation >= self.min_saturation)
            & (brightness >= self.min_value)
        )
        valid_indices = palette_indices[valid_mask]
        valid_count = int(valid_indices.size)
        total_pixels = int(frame_small.shape[0] * frame_small.shape[1])

        if valid_count < self.min_valid_pixels:
            return {
                "co2_min_ppm": None,
                "co2_max_ppm": None,
                "co2_mean_ppm": None,
                "valid_pixel_count": valid_count,
                "valid_pixel_ratio": round(valid_count / max(total_pixels, 1), 6),
                "quality": "insufficient_matching_pixels",
            }, valid_mask

        ppm_values = self.PPM_MIN + (
            valid_indices.astype(np.float32)
            * (self.PPM_MAX - self.PPM_MIN)
            / 255.0
        )
        co2_min = float(np.percentile(ppm_values, 1))
        co2_max = float(np.percentile(ppm_values, 99))
        co2_mean = float(np.mean(ppm_values))

        return {
            "co2_min_ppm": round(co2_min, 3),
            "co2_max_ppm": round(co2_max, 3),
            "co2_mean_ppm": round(co2_mean, 3),
            "observed_min_ppm": round(float(np.min(ppm_values)), 3),
            "observed_max_ppm": round(float(np.max(ppm_values)), 3),
            "valid_pixel_count": valid_count,
            "valid_pixel_ratio": round(valid_count / max(total_pixels, 1), 6),
            "quality": "approximate_visible_color_match",
        }, valid_mask
    def process(
        self,
        video_path: Path,
        colorbar_path: Path,
        output_dir: Path,
    ) -> Path:
        video_path = Path(video_path)
        colorbar_path = Path(colorbar_path)
        output_dir = Path(output_dir)

        if not video_path.exists():
            raise FileNotFoundError(f"CO2 video not found: {video_path}")
        if not colorbar_path.exists():
            raise FileNotFoundError(f"CO2 colorbar not found: {colorbar_path}")

        output_dir.mkdir(parents=True, exist_ok=True)

        palette_bgr, _ = self.build_color_palette(colorbar_path)
        index_lut, distance_lut = self.build_lab_lookup(palette_bgr)

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open CO2 video: {video_path}")

        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if fps <= 0:
            cap.release()
            raise RuntimeError("Invalid video FPS")

        frame_results = []
        frame_id = 0
        debug_saved = False

        try:
            while True:
                success, frame = cap.read()
                if not success:
                    break

                stats, valid_mask = self.process_frame(
                    frame,
                    index_lut,
                    distance_lut,
                )

                video_time_sec = frame_id / fps
                simulation_time = (
                    self.START_SIMULATION_TIME
                    + timedelta(hours=frame_id * self.SIMULATION_HOURS_PER_FRAME)
                )

                stats["frame_id"] = frame_id
                stats["video_time_sec"] = round(video_time_sec, 3)
                stats["simulation_timestamp"] = simulation_time.isoformat()
                frame_results.append(stats)

                if self.save_debug and not debug_saved:
                    preview = cv2.resize(
                        frame,
                        (valid_mask.shape[1], valid_mask.shape[0]),
                        interpolation=cv2.INTER_AREA,
                    )
                    mask_image = (valid_mask.astype(np.uint8) * 255)
                    overlay = preview.copy()
                    overlay[valid_mask] = (
                        0.35 * overlay[valid_mask]
                        + 0.65 * np.array([0, 255, 0], dtype=np.float32)
                    ).astype(np.uint8)

                    cv2.imwrite(str(output_dir / "co2_first_frame_mask.png"), mask_image)
                    cv2.imwrite(str(output_dir / "co2_first_frame_debug.jpg"), overlay)
                    debug_saved = True
                frame_id += 1
        finally:
            cap.release()
        usable = [
            row for row in frame_results
            if row["co2_mean_ppm"] is not None
        ]
        if usable:
            summary = {
                "visible_min_ppm_p01": round(
                    min(row["co2_min_ppm"] for row in usable), 3
                ),
                "visible_max_ppm_p99": round(
                    max(row["co2_max_ppm"] for row in usable), 3
                ),
                "mean_of_frame_means_ppm": round(
                    float(np.mean([row["co2_mean_ppm"] for row in usable])), 3
                ),
                "usable_frame_count": len(usable),
            }
        else:
            summary = {
                "visible_min_ppm_p01": None,
                "visible_max_ppm_p99": None,
                "mean_of_frame_means_ppm": None,
                "usable_frame_count": 0,
            }

        output = {
            "topic": "co2",
            "source_video": video_path.name,
            "source_colorbar": colorbar_path.name,
            "video_metadata": {
                "width": width,
                "height": height,
                "fps": fps,
                "reported_frame_count": total_frames,
                "processed_frame_count": frame_id,
                "video_duration_sec": round(frame_id / fps, 3),
            },
            "simulation_time_assumption": {
                "start": self.START_SIMULATION_TIME.isoformat(),
                "hours_per_frame": self.SIMULATION_HOURS_PER_FRAME,
                "note": "Based on timestamps visible in the supplied NASA animation; verify against the matching NASA timestamp list.",
            },
            "mapping": {
                "method": "BGR_to_LAB_nearest_colorbar_match",
                "ppm_range": [self.PPM_MIN, self.PPM_MAX],
                "color_distance_threshold": self.color_distance_threshold,
                "min_saturation": self.min_saturation,
                "min_value": self.min_value,
                "min_max_definition": "1st and 99th percentiles of accepted visible pixels",
                "scientific_accuracy": "approximate_only",
                "warning": (
                    "The supplied movie is a composited globe visualization. "
                    "The NASA colorbar represents both color and opacity transfer functions. "
                    "Thus matched pixel colors can be altered by blending with the Earth surface; "
                    "these are visible-rendering estimates, not exact global CO2 measurements."
                ),
            },
            "summary": summary,
            "frames": frame_results,
        }
        output_path = output_dir / "co2.json"
        with output_path.open("w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        return output_path

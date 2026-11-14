from pathlib import Path
import json
import cv2
import numpy as np
from datetime import datetime, timedelta, timezone

class NightLightsExtractor:
    def read_frame(self, cap, frame_id):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_id)
        ret, frame = cap.read()
        if not ret:
            raise RuntimeError(
                f"Cannot read frame {frame_id}"
            )
        return frame

    def to_gray(self, frame):
        return cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2GRAY
        )

    def subtract_background(self, current, background):
        current = current.astype(np.int16)
        background = background.astype(np.int16)
        difference = current - background
        difference = np.clip(
            difference,
            0,
            255
        )
        return difference.astype(np.uint8)

    def create_valid_mask(self, height, width, mask_boxes):
        valid_mask = np.ones(
            (height, width),
            dtype=np.uint8
        )
        for box in mask_boxes:
            if len(box) != 4:
                raise ValueError(
                    f"Invalid mask box: {box}"
                )
            y0, y1, x0, x1 = map(int, box)
            if not (
                0 <= y0 < y1 <= height
                and 0 <= x0 < x1 <= width
            ):
                raise ValueError(
                    f"Mask coordinates out of bounds: {box}"
                )
            valid_mask[y0:y1, x0:x1] = 0
        return valid_mask

    def apply_mask(self, image, valid_mask):
        """
        Apply mask to an image for debugging.

        This function does not change the original image.
        Excluded pixels are displayed as black.
        """

        result = image.copy()

        result[valid_mask == 0] = 0

        return result

    def save_mask_debug(self, valid_mask, debug_dir):
        mask_image = valid_mask * 255
        cv2.imwrite(
            str(debug_dir / "valid_mask.png"),
            mask_image
        )

    def get_percentile(self, histogram, percentile):
        total = int(histogram.sum())
        if total == 0:
            return 0
        target = total * percentile / 100.0
        cumulative = np.cumsum(histogram)
        return int(
            np.searchsorted(cumulative, target)
        )

    def normalize(self, image, bg, ref):
        if ref <= bg:
            raise ValueError(
                f"Invalid calibration: bg={bg}, ref={ref}"
            )
        image = image.astype(np.float32)
        normalized = (
            (image - bg) / (ref - bg)
        )
        return np.clip(
            normalized,
            0.0,
            1.0
        )


    def create_grid(self,image,valid_mask,rows,cols,aggregate="p97"):
        height, width = image.shape
        columns = []
        for c in range(cols):
            row_values = []
            for r in range(rows):
                y0 = r * height // rows
                y1 = (r + 1) * height // rows
                x0 = c * width // cols
                x1 = (c + 1) * width // cols
                cell_image = image[y0:y1, x0:x1]
                cell_mask = valid_mask[y0:y1, x0:x1]
                total_pixels = cell_mask.size
                valid_pixels = cell_image[
                    cell_mask == 1
                ]
                if total_pixels == 0:
                    cover = 0.0
                else:
                    cover = (
                        len(valid_pixels) / total_pixels
                    )
                if len(valid_pixels) == 0:
                    value = 0.0
                elif aggregate == "p97":
                    value = float(
                        np.percentile(valid_pixels, 97)
                    )
                elif aggregate == "mean":
                    value = float(
                        np.mean(valid_pixels)
                    )
                elif aggregate == "max":
                    value = float(
                        np.max(valid_pixels)
                    )
                else:
                    raise ValueError(
                        f"Unknown aggregation method: {aggregate}"
                    )
                row_values.append({
                    "value": value,
                    "cover": float(cover)
                })
            columns.append({
                "column": c,
                "rows": row_values
            })

        return columns



    def extract_change_reference(self,cap,meta,output_dir,width,height,total_frames):
        change_config = meta.get(
            "segments", {}
        ).get("change")

        if not change_config:
            print(
                "[WARNING] No change segment configured"
            )

            return None
        first = int(change_config["first"])
        last = int(change_config["last"])

        frame_id = int(
            change_config.get(
                "frame",
                (first + last) // 2
            )
        )
        if not (0 <= first <= last < total_frames):
            raise ValueError(
                "Invalid change segment configuration"
            )
        if not (first <= frame_id <= last):
            raise ValueError(
                f"Change frame {frame_id} is outside "
                f"the configured segment"
            )
        frame = self.read_frame(
            cap,
            frame_id
        )
        change_dir = output_dir / "change"
        change_dir.mkdir(
            parents=True,
            exist_ok=True
        )
        frame_path = change_dir / "change_frame.png"
        cv2.imwrite(
            str(frame_path),
            frame
        )
        legend_config = meta.get("legend_bar")

        legend_path = None

        if legend_config:

            y0 = int(legend_config["y0"])
            y1 = int(legend_config["y1"])

            x0 = int(legend_config["x0"])
            x1 = int(legend_config["x1"])

            if not (
                0 <= y0 < y1 <= height
                and 0 <= x0 < x1 <= width
            ):
                raise ValueError(
                    "Invalid legend_bar coordinates"
                )

            legend = frame[y0:y1, x0:x1]

            legend_path = change_dir / "legend.png"

            cv2.imwrite(
                str(legend_path),
                legend
            )
        print(
            f"[CHANGE] Frame: {frame_id}"
        )

        print(
            f"[CHANGE] Saved frame: {frame_path}"
        )

        if legend_path:
            print(
                f"[CHANGE] Saved legend: {legend_path}"
            )

        return {
            "frame_id": frame_id,
            "frame_path": str(frame_path),
            "legend_path": (
                str(legend_path)
                if legend_path is not None
                else None
            ),
            "decoded": False
        }

    def process(self, source, output_dir):
        output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        debug_dir = output_dir / "debug"

        debug_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        output_json = (
            output_dir / "night_lights.json"
        )
        if not source.videos:
            raise FileNotFoundError(
                "No video found for night_lights"
            )

        video_path = source.videos[0]

        cap = cv2.VideoCapture(
            str(video_path)
        )

        if not cap.isOpened():
            raise RuntimeError(
                f"Cannot open video: {video_path}"
            )

        try:

            fps = cap.get(
                cv2.CAP_PROP_FPS
            )

            total_frames = int(
                cap.get(cv2.CAP_PROP_FRAME_COUNT)
            )

            width = int(
                cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            )

            height = int(
                cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            )

            print("\n" + "=" * 60)
            print("[NIGHT LIGHTS] Starting extraction")
            print(f"[INFO] Video: {video_path}")
            print(f"[INFO] Resolution: {width} x {height}")
            print(f"[INFO] FPS: {fps}")
            print(f"[INFO] Total frames: {total_frames}")
            print("=" * 60)
            meta = source.meta
            annual = meta["segments"]["annual"]
            start_year = int(
                annual["start_year"]
            )
            first_frame = int(
                annual["first_frame"]
            )
            frames_per_year = int(
                annual["frames_per_year"]
            )
            count = int(
                annual["count"]
            )
            if frames_per_year <= 0 or count <= 0:
                raise ValueError(
                    "frames_per_year and count must be positive"
                )
            sampling_offset = int(
                meta.get("sampling", {}).get(
                    "offset",
                    frames_per_year // 2
                )
            )
            if not (0 <= sampling_offset < frames_per_year):
                raise ValueError(
                    "sampling.offset must be inside "
                    "the annual frame interval"
                )
            background_frame_id = int(
                meta.get("background_frame", 960)
            )

            mask_boxes = meta.get(
                "mask_boxes",
                []
            )

            aggregate = meta.get(
                "cell_aggregate",
                "p97"
            )

            threshold = float(
                meta.get("lit_threshold", 0.12)
            )

            if not (0.0 <= threshold <= 1.0):
                raise ValueError(
                    "lit_threshold must be between 0 and 1"
                )
            audio_rows = 16
            audio_cols = 96
            data_rows = 90
            data_cols = 180
            if not (
                0 <= background_frame_id < total_frames
            ):
                raise ValueError(
                    f"Invalid background frame: "
                    f"{background_frame_id}"
                )
            valid_mask = self.create_valid_mask(
                height,
                width,
                mask_boxes
            )

            valid_count = int(
                np.count_nonzero(valid_mask)
            )

            if valid_count == 0:
                raise ValueError(
                    "Mask excludes all image pixels"
                )
            print(
                f"[MASK] Valid pixels: {valid_count}"
            )
            print(
                f"[MASK] Excluded pixels: "
                f"{height * width - valid_count}"
            )
            if not mask_boxes:
                print(
                    "[WARNING] No mask_boxes configured. "
                    "Year labels may enter the measurements."
                )
            self.save_mask_debug(
                valid_mask,
                debug_dir
            )
            print(
                "\n[BACKGROUND] Reading frame",
                background_frame_id
            )

            background_bgr = self.read_frame(
                cap,
                background_frame_id
            )

            background_gray = self.to_gray(
                background_bgr
            )

            # Save masked background for debugging
            background_debug = self.apply_mask(
                background_gray,
                valid_mask
            )

            cv2.imwrite(
                str(
                    debug_dir / "background_gray.png"
                ),
                background_debug
            )
            annual_frames = []

            for i in range(count):

                year = start_year + i

                frame_id = (
                    first_frame
                    + i * frames_per_year
                    + sampling_offset
                )

                if not (
                    0 <= frame_id < total_frames
                ):
                    raise ValueError(
                        f"Invalid frame {frame_id} "
                        f"for year {year}"
                    )

                annual_frames.append({
                    "year": year,
                    "frame_id": frame_id
                })
            print(
                "\n" + "=" * 60
            )

            print(
                "[PHASE 1] GLOBAL CALIBRATION"
            )

            print(
                "=" * 60
            )

            global_histogram = np.zeros(
                256,
                dtype=np.int64
            )

            for item in annual_frames:

                year = item["year"]
                frame_id = item["frame_id"]

                frame = self.read_frame(
                    cap,
                    frame_id
                )

                gray = self.to_gray(frame)
                difference = self.subtract_background(
                    gray,
                    background_gray
                )
                valid_values = difference[
                    valid_mask == 1
                ]
                histogram = np.bincount(
                    valid_values,
                    minlength=256
                )
                global_histogram += histogram
                print(
                    f"[PHASE 1] {year}: "
                    f"frame={frame_id}"
                )
            bg = self.get_percentile(
                global_histogram,
                50
            )

            ref = self.get_percentile(
                global_histogram,
                99
            )

            if ref <= bg:
                raise ValueError(
                    f"Calibration failed: bg={bg}, ref={ref}. "
                    "Check the background frame and annual frames."
                )

            print(
                f"\n[CALIBRATION] P50 (bg) = {bg}"
            )

            print(
                f"[CALIBRATION] P99 (ref) = {ref}"
            )

            print(
                "\n" + "=" * 60
            )

            print(
                "[PHASE 2] FEATURE EXTRACTION"
            )

            print(
                "=" * 60
            )

            results = []

            previous_mean = None

            for item in annual_frames:

                year = item["year"]
                frame_id = item["frame_id"]

                frame = self.read_frame(
                    cap,
                    frame_id
                )

                gray = self.to_gray(frame)
                difference = self.subtract_background(
                    gray,
                    background_gray
                )

                normalized = self.normalize(
                    difference,
                    bg,
                    ref
                )
                values = normalized[
                    valid_mask == 1
                ]

                if len(values) == 0:
                    raise ValueError(
                        f"No valid pixels for year {year}"
                    )

                mean_value = float(
                    np.mean(values)
                )

                p90 = float(
                    np.percentile(values, 90)
                )

                median = float(
                    np.median(values)
                )

                max_value = float(
                    np.max(values)
                )

                lit_ratio = float(
                    np.mean(values > threshold)
                )
                if previous_mean is None:
                    delta = 0.0
                else:
                    delta = (
                        mean_value - previous_mean
                    )

                previous_mean = mean_value
                audio_columns = self.create_grid(
                    normalized,
                    valid_mask,
                    rows=audio_rows,
                    cols=audio_cols,
                    aggregate=aggregate
                )
                data_columns = self.create_grid(
                    normalized,
                    valid_mask,
                    rows=data_rows,
                    cols=data_cols,
                    aggregate=aggregate
                )
                difference_debug = self.apply_mask(
                    difference,
                    valid_mask
                )

                cv2.imwrite(
                    str(
                        debug_dir /
                        f"difference_{year}.png"
                    ),
                    difference_debug
                )

                normalized_image = (
                    normalized * 255
                ).astype(np.uint8)

                normalized_debug = self.apply_mask(
                    normalized_image,
                    valid_mask
                )

                cv2.imwrite(
                    str(
                        debug_dir /
                        f"normalized_{year}.png"
                    ),
                    normalized_debug
                )
                year_result = {
                    "year": year,

                    "frame_id": frame_id,

                    "stats": {
                        "mean": mean_value,
                        "p90": p90,
                        "median": median,
                        "max": max_value,
                        "lit_ratio": lit_ratio,
                        "deltaFromPrev": float(delta)
                    },

                    "audioColumns": audio_columns,

                    "columns": data_columns
                }

                results.append(
                    year_result
                )

                print(
                    f"[PHASE 2] {year}: "
                    f"mean={mean_value:.6f}, "
                    f"p90={p90:.6f}, "
                    f"lit_ratio={lit_ratio:.6f}, "
                    f"delta={delta:.6f}"
                )
            print(
                "\n[CHANGE] Extracting change map"
            )

            change_reference = self.extract_change_reference(
                cap=cap,
                meta=meta,
                output_dir=output_dir,
                width=width,
                height=height,
                total_frames=total_frames
            )
            output_data = {
                "topic": "night_lights",

                "source": {
                    "video": video_path.name,
                    "fps": float(fps),
                    "width": width,
                    "height": height
                },

                "calibration": {
                    "method": "global_percentile",

                    "background_frame": background_frame_id,

                    "background_subtraction": (
                        "clip(current - background, 0, 255)"
                    ),

                    "bg": bg,
                    "ref": ref,

                    "normalization": (
                        "clip((value - bg) / (ref - bg), 0, 1)"
                    )
                },

                "mask": {
                    "boxes": mask_boxes,
                    "valid_pixels": valid_count,
                    "excluded_pixels": (
                        height * width - valid_count
                    )
                },

                "grid": {
                    "audio": {
                        "rows": audio_rows,
                        "cols": audio_cols
                    },

                    "data": {
                        "rows": data_rows,
                        "cols": data_cols
                    }
                },

                "change_reference": change_reference,

                "frames": results
            }

            # Write JSON once, after all frames
            with open(
                output_json,
                "w",
                encoding="utf-8"
            ) as f:

                json.dump(
                    output_data,
                    f,
                    ensure_ascii=False,
                    indent=2
                )

            print(
                "\n" + "=" * 60
            )

            print(
                "[SUCCESS] Night Lights extraction completed"
            )

            print(
                f"[OUTPUT] {output_json}"
            )

            print(
                f"[DEBUG] {debug_dir}"
            )

            print(
                "=" * 60
            )

            return output_json

        finally:

            cap.release()

class CO2Extractor:
    pass






class OceanExtractor:

    # =====================================================
    # CONFIGURATION
    # =====================================================

    def __init__(
        self,
        sample_step=1,
        warm_threshold=25.0,
        cold_threshold=10.0,
        color_distance_threshold=25.0,
        histogram_bins=320
    ):

        self.sample_step = sample_step

        self.warm_threshold = warm_threshold
        self.cold_threshold = cold_threshold

        self.color_distance_threshold = color_distance_threshold

        self.histogram_bins = histogram_bins

        self.temp_min = 0.0
        self.temp_max = 32.0

        self.mapper = None

    # =====================================================
    # PHASE 1: TEMPERATURE MAPPER
    # =====================================================

    def build_temperature_mapper(
        self,
        colorbar_path,
        x_range=(14, 293),
        y_range=(30, 68)
    ):
        """
        Extract the NASA color gradient and build
        a 5-bit quantized BGR -> Temperature lookup table.

        Colorbar temperature range: 0 - 32 Celsius.
        """


        colorbar = cv2.imread(
            str(colorbar_path),
            cv2.IMREAD_COLOR
        )

        if colorbar is None:
            raise FileNotFoundError(
                f"Cannot read colorbar: {colorbar_path}"
            )

        height, width = colorbar.shape[:2]

        x0, x1 = x_range
        y0, y1 = y_range

        if not (
            0 <= x0 < x1 <= width
            and 0 <= y0 < y1 <= height
        ):
            raise ValueError(
                "Invalid colorbar crop coordinates"
            )

        # Extract gradient only, excluding labels
        gradient = colorbar[y0:y1, x0:x1]

        # Median across rows to reduce pixel noise
        palette_bgr = np.median(
            gradient.astype(np.float32),
            axis=0
        ).astype(np.uint8)

        palette_size = len(palette_bgr)

        temperatures = np.linspace(
            self.temp_min,
            self.temp_max,
            palette_size,
            dtype=np.float32
        )

        # Convert palette to LAB
        palette_lab = cv2.cvtColor(
            palette_bgr.reshape(1, -1, 3),
            cv2.COLOR_BGR2LAB
        ).reshape(-1, 3).astype(np.float32)

        # -------------------------------------------------
        # Build 5-bit BGR lookup table
        # -------------------------------------------------

        levels = np.arange(
            32,
            dtype=np.float32
        ) * 8 + 3.5

        b, g, r = np.meshgrid(
            levels,
            levels,
            levels,
            indexing="ij"
        )

        quantized_bgr = np.stack(
            [b, g, r],
            axis=-1
        ).astype(np.uint8)
        quantized_bgr = quantized_bgr.reshape(-1, 1, 3)
        quantized_lab = cv2.cvtColor(
            quantized_bgr,
            cv2.COLOR_BGR2LAB
        ).astype(np.float32)

        flat_lab = quantized_lab.reshape(-1, 3)

        lookup_temp = np.zeros(
            32 ** 3,
            dtype=np.float32
        )

        lookup_distance = np.zeros(
            32 ** 3,
            dtype=np.float32
        )

        # Process in chunks to reduce memory usage
        chunk_size = 2048

        for start in range(
            0,
            len(flat_lab),
            chunk_size
        ):

            end = min(
                start + chunk_size,
                len(flat_lab)
            )

            chunk = flat_lab[start:end]

            distances = np.sum(
                (chunk[:, None, :] -
                 palette_lab[None, :, :]) ** 2,
                axis=2
            )

            nearest = np.argmin(
                distances,
                axis=1
            )

            min_distance = np.sqrt(
                distances[
                    np.arange(len(chunk)),
                    nearest
                ]
            )

            lookup_temp[start:end] = temperatures[nearest]

            lookup_distance[start:end] = min_distance

        self.mapper = {
            "temperature": lookup_temp.reshape(32, 32, 32),
            "distance": lookup_distance.reshape(32, 32, 32),
            "palette_size": palette_size
        }

        return self.mapper

    # =====================================================
    # PHASE 1: VIDEO PREPROCESSING
    # =====================================================

    def read_frame(self, cap):
        ret, frame = cap.read()

        if not ret:
            return None

        return frame

    def map_temperature(self, frame):
        """
        Convert BGR pixels into estimated temperature.

        Invalid/background pixels are represented by NaN.
        """

        if self.mapper is None:
            raise RuntimeError(
                "Temperature mapper has not been initialized"
            )

        b = frame[:, :, 0] >> 3
        g = frame[:, :, 1] >> 3
        r = frame[:, :, 2] >> 3

        temperature = self.mapper["temperature"][
            b, g, r
        ]

        distance = self.mapper["distance"][
            b, g, r
        ]

        # Exclude colors that do not sufficiently
        # match the NASA colorbar.
        valid_mask = (
            distance <= self.color_distance_threshold
        )

        # Exclude very dark and low-saturation pixels
        hsv = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2HSV
        )

        saturation = hsv[:, :, 1]
        brightness = hsv[:, :, 2]

        valid_mask &= (
            (saturation >= 35) &
            (brightness >= 30)
        )

        temperature_map = np.full(
            frame.shape[:2],
            np.nan,
            dtype=np.float32
        )

        temperature_map[valid_mask] = temperature[
            valid_mask
        ]

        return temperature_map, valid_mask

    # =====================================================
    # PHASE 2: TEMPERATURE FEATURES
    # =====================================================

    def extract_temperature_features(
        self,
        temperature_map,
        valid_mask
    ):

        valid_temp = temperature_map[valid_mask]

        total_pixels = temperature_map.size

        valid_count = len(valid_temp)

        if valid_count == 0:

            return {
                "mean_temp": None,
                "min_temp": None,
                "max_temp": None,
                "p10_temp": None,
                "p90_temp": None,
                "std_temp": None,
                "warm_ratio": None,
                "cold_ratio": None,
                "valid_pixel_count": 0,
                "color_match_coverage": 0.0
            }

        mean_temp = np.mean(valid_temp)

        min_temp = np.min(valid_temp)

        max_temp = np.max(valid_temp)

        p10_temp = np.percentile(
            valid_temp,
            10
        )

        p90_temp = np.percentile(
            valid_temp,
            90
        )

        std_temp = np.std(valid_temp)

        warm_ratio = np.mean(
            valid_temp >= self.warm_threshold
        )

        cold_ratio = np.mean(
            valid_temp <= self.cold_threshold
        )

        return {
            "mean_temp": float(mean_temp),
            "min_temp": float(min_temp),
            "max_temp": float(max_temp),

            "p10_temp": float(p10_temp),
            "p90_temp": float(p90_temp),

            "std_temp": float(std_temp),

            "warm_ratio": float(warm_ratio),
            "cold_ratio": float(cold_ratio),

            "valid_pixel_count": int(valid_count),

            "color_match_coverage": float(
                valid_count / total_pixels
            )
        }

    # =====================================================
    # PHASE 2: TEMPORAL FEATURES
    # =====================================================

    def extract_temporal_features(
        self,
        current_features,
        previous_features
    ):

        if previous_features is None:
            return {
                "mean_temp_change": None
            }

        current = current_features["mean_temp"]

        previous = previous_features["mean_temp"]

        if current is None or previous is None:
            change = None

        else:
            change = current - previous

        return {
            "mean_temp_change": (
                float(change)
                if change is not None
                else None
            )
        }

    # =====================================================
    # PHASE 3: PERIOD AGGREGATION
    # =====================================================

    def aggregate_statistics(
        self,
        frames,
        temperature_histogram,
        total_valid_pixels
    ):

        valid_means = [
            f["temperature"]["mean_temp"]
            for f in frames
            if f["temperature"]["mean_temp"] is not None
        ]

        valid_mins = [
            f["temperature"]["min_temp"]
            for f in frames
            if f["temperature"]["min_temp"] is not None
        ]

        valid_maxs = [
            f["temperature"]["max_temp"]
            for f in frames
            if f["temperature"]["max_temp"] is not None
        ]

        valid_warm = [
            (
                f["temperature"]["warm_ratio"],
                f["temperature"]["valid_pixel_count"]
            )
            for f in frames
            if f["temperature"]["warm_ratio"] is not None
        ]

        valid_cold = [
            (
                f["temperature"]["cold_ratio"],
                f["temperature"]["valid_pixel_count"]
            )
            for f in frames
            if f["temperature"]["cold_ratio"] is not None
        ]

        if total_valid_pixels == 0:

            return {
                "mean_temp": None,
                "min_temp": None,
                "max_temp": None,
                "p10_temp": None,
                "p90_temp": None,
                "std_temp": None,
                "warm_ratio": None,
                "cold_ratio": None
            }

        # Histogram-based aggregation
        # Avoid storing every pixel from every frame.

        bin_width = (
            self.temp_max - self.temp_min
        ) / self.histogram_bins

        bin_centers = (
            np.arange(self.histogram_bins) + 0.5
        ) * bin_width + self.temp_min

        cumulative = np.cumsum(
            temperature_histogram
        )

        def histogram_percentile(percentile):

            target = (
                percentile / 100.0
            ) * total_valid_pixels

            index = np.searchsorted(
                cumulative,
                target
            )

            index = min(
                index,
                self.histogram_bins - 1
            )

            return float(bin_centers[index])

        mean_temp = np.dot(
            temperature_histogram,
            bin_centers
        ) / total_valid_pixels

        variance = np.dot(
            temperature_histogram,
            (bin_centers - mean_temp) ** 2
        ) / total_valid_pixels

        # Weighted warm/cold ratios
        warm_count = sum(
            ratio * count
            for ratio, count in valid_warm
        )

        cold_count = sum(
            ratio * count
            for ratio, count in valid_cold
        )

        return {
            "mean_temp": float(mean_temp),

            "min_temp": float(min(valid_mins)),
            "max_temp": float(max(valid_maxs)),

            "p10_temp": histogram_percentile(10),
            "p90_temp": histogram_percentile(90),

            "std_temp": float(np.sqrt(variance)),

            "warm_ratio": float(
                warm_count / total_valid_pixels
            ),

            "cold_ratio": float(
                cold_count / total_valid_pixels
            ),

            "valid_pixel_count": int(total_valid_pixels)
        }

    # =====================================================
    # MAIN PIPELINE
    # =====================================================

    def process(
        self,
        video_path,
        colorbar_path,
        output_dir
    ):

        video_path = Path(video_path)
        colorbar_path = Path(colorbar_path)
        output_dir = Path(output_dir)

        output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        output_json = output_dir / "ocean.json"

        # -------------------------------------------------
        # Initialize color lookup table
        # -------------------------------------------------

        self.build_temperature_mapper(
            colorbar_path
        )

        # -------------------------------------------------
        # Open video
        # -------------------------------------------------

        cap = cv2.VideoCapture(
            str(video_path)
        )

        if not cap.isOpened():
            raise RuntimeError(
                f"Cannot open video: {video_path}"
            )

        width = int(
            cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        )

        height = int(
            cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        )

        fps = cap.get(
            cv2.CAP_PROP_FPS
        )

        total_frames = int(
            cap.get(cv2.CAP_PROP_FRAME_COUNT)
        )

        # -------------------------------------------------
        # Initialize aggregation
        # -------------------------------------------------

        frames = []

        histogram = np.zeros(
            self.histogram_bins,
            dtype=np.int64
        )

        total_valid_pixels = 0

        previous_features = None

        frame_id = 0

        # -------------------------------------------------
        # Process video
        # -------------------------------------------------

        while True:

            frame = self.read_frame(cap)

            if frame is None:
                break

            current_frame_id = frame_id

            frame_id += 1

            if current_frame_id % self.sample_step != 0:
                continue

            # ---------------------------------------------
            # Phase 1: Preprocessing
            # ---------------------------------------------

            temperature_map, valid_mask = (
                self.map_temperature(frame)
            )

            # ---------------------------------------------
            # Phase 2: Feature Extraction
            # ---------------------------------------------

            temperature_features = (
                self.extract_temperature_features(
                    temperature_map,
                    valid_mask
                )
            )

            current_features = {
                "frame_id": current_frame_id,

                "video_time_seconds": (
                    float(current_frame_id / fps)
                    if fps > 0
                    else None
                ),

                "temperature": temperature_features
            }

            current_features["temporal"] = (
                self.extract_temporal_features(
                    current_features["temperature"],
                    previous_features
                )
            )

            frames.append(current_features)

            # ---------------------------------------------
            # Update histogram
            # ---------------------------------------------

            valid_temp = temperature_map[valid_mask]

            if len(valid_temp) > 0:

                frame_histogram, _ = np.histogram(
                    valid_temp,
                    bins=self.histogram_bins,
                    range=(
                        self.temp_min,
                        self.temp_max
                    )
                )

                histogram += frame_histogram

                total_valid_pixels += len(valid_temp)

            previous_features = (
                current_features["temperature"]
            )

        cap.release()

        # -------------------------------------------------
        # Period summary
        # -------------------------------------------------

        statistics = self.aggregate_statistics(
            frames,
            histogram,
            total_valid_pixels
        )

        # -------------------------------------------------
        # JSON output
        # -------------------------------------------------

        result = {

            "schema_version": "1.0",

            "dataset": "global_sea_surface_temperature",

            "source": {
                "organization": "NASA",
                "visualization_id": 3912,
                "model": "ECCO2",
                "url": "https://svs.gsfc.nasa.gov/3912/"
            },

            "description": (
                "Sea surface temperature features "
                "extracted from NASA ECCO2 visualization."
            ),

            "temperature": {
                "unit": "celsius",
                "min": self.temp_min,
                "max": self.temp_max,

                "warm_threshold": self.warm_threshold,
                "cold_threshold": self.cold_threshold
            },

            "time_range": {
                "start": "2007-03-25T12:00:00Z",
                "end": "2008-03-03T12:00:00Z"
            },

            "video": {
                "width": width,
                "height": height,
                "fps": fps,
                "total_frames": total_frames,
                "processed_frames": len(frames),
                "sample_step": self.sample_step
            },

            "processing": {
                "color_space": "BGR",
                "temperature_mapping": "NASA colorbar LUT",
                "matching_space": "CIELAB",
                "color_distance_threshold": (
                    self.color_distance_threshold
                ),
                "background_subtraction": False,
                "grayscale": False,
                "motion_analysis": False
            },

            "statistics": statistics,

            "frames": frames
        }

        with open(
            output_json,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                result,
                f,
                indent=4,
                ensure_ascii=False,
                allow_nan=False
            )

        print(
            f"Ocean extraction completed: {output_json}"
        )

        print(
            f"Processed frames: {len(frames)}"
        )

        print(
            f"Mean temperature: {statistics['mean_temp']}"
        )

        return result

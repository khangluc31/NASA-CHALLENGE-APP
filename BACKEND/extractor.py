
import json
import cv2
import numpy as np
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
    pass

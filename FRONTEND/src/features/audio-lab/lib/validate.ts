import type { Features, RawData } from "../../../../audio";

const inUnit = (x: unknown): boolean => typeof x === "number" && x >= 0 && x <= 1;

export const LIT_THRESHOLD = 0.12;

/** Kiểm tra JSON theo contracts.md (định dạng mới: frames[]). */
export function validateRaw(d: RawData | null | undefined): string[] {
  const frames = d?.frames;
  if (!Array.isArray(frames) || !frames.length) return ["missing frames[]"];

  const errs: string[] = [];
  if (typeof d?.calibration?.bg !== "number" || typeof d?.calibration?.ref !== "number")
    errs.push("calibration.bg / calibration.ref missing");

  const nCols = frames[0].audioColumns?.length;
  const nRows = frames[0].audioColumns?.[0]?.rows?.length;

  frames.forEach((fr, fi) => {
    const tag = `frame ${fi} (year ${fr.year})`;
    if (!Number.isFinite(fr.year)) errs.push(`${tag}: missing year`);

    const cols = fr.audioColumns;
    if (!Array.isArray(cols)) {
      errs.push(`${tag}: missing audioColumns`);
      return;
    }
    if (cols.length !== nCols) errs.push(`${tag}: ${cols.length} cols, first frame has ${nCols}`);

    for (const k of ["mean", "deltaFromPrev"] as const)
      if (typeof fr.stats?.[k] !== "number") errs.push(`${tag}: stats.${k} missing`);

    cols.forEach((c, ci) => {
      if (c.rows?.length !== nRows) errs.push(`${tag} col ${ci}: ${c.rows?.length} rows, need ${nRows}`);
      c.rows?.forEach((r, ri) => {
        if (!inUnit(r.value)) errs.push(`${tag} cell (${ci},${ri}): value=${r.value} out of 0..1`);
        if (!inUnit(r.cover)) errs.push(`${tag} cell (${ci},${ri}): cover=${r.cover} out of 0..1`);
      });
    });
  });
  return errs;
}

/** Cảnh báo (không phải lỗi): gợi ý dữ liệu có vẻ nhiễu. */
export function warningsRaw(d: RawData): string[] {
  const w: string[] = [];
  const cols = d.frames?.[0]?.audioColumns;
  if (!cols?.length) return w;

  const last = (cols[0].rows?.length ?? 0) - 1;
  if (last < 0) return w;

  const frac = cols.filter((c) => (c.rows?.[last]?.value ?? 0) > LIT_THRESHOLD).length / cols.length;
  if (frac > 0.3)
    w.push(
      `last (lowest) row exceeds 0.12 in ${(100 * frac).toFixed(0)}% of cols; may be unmasked noise at the image bottom`,
    );

  const covers = cols.flatMap((c) => (c.rows ?? []).map((r) => r.cover));
  if (covers.every((x) => x === 1)) w.push("cover is always 1 in the first frame: meaning of cover not verified");
  return w;
}

export function summarize(f: Features, yearCount: number): string {
  let lit = 0;
  let total = 0;
  for (const c of f.columns)
    for (const r of c.rows) {
      total++;
      if (r.light > LIT_THRESHOLD) lit++;
    }
  const litCols = f.columns.filter((c) => c.rows.some((r) => r.light > LIT_THRESHOLD)).length;
  const urgency = f.stats?.urgency ?? f.stats?.warmRatio ?? 0;
  return [
    f.title ?? f.id ?? "(untitled)",
    `${f.columns.length} cols x ${f.columns[0].rows.length} rows`,
    `audible cells: ${lit}/${total} (${((100 * lit) / total).toFixed(1)}%)`,
    `audible cols: ${litCols}/${f.columns.length}`,
    `urgency=${urgency.toFixed(2)}${yearCount ? ` | ${yearCount} years` : ""}`,
  ].join(" | ");
}

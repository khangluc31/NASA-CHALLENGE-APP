import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { engine, makeMockNightLights, pickFromImage } from "../../../audio";
import type { Features, RawData, ScaleName, YearEntry } from "../../../audio";
import type { Cursor } from "./lib/draw";
import type { Swatch } from "./lib/swatches";
import { LIT_THRESHOLD, summarize, validateRaw, warningsRaw } from "./lib/validate";

/* ------------------------------------------------------------------ */
/* Log                                                                 */
/* ------------------------------------------------------------------ */
export type LogTone = "ok" | "bad" | "dim" | "";
export interface LogEntry {
  id: number;
  time: string;
  msg: string;
  tone: LogTone;
}
const MAX_LOGS = 500;
let logId = 0;
const makeLog = (msg: string, tone: LogTone = ""): LogEntry => ({
  id: logId++,
  time: new Date().toLocaleTimeString(),
  msg,
  tone,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
interface JukeboxState {
  /* dữ liệu */
  rawData: RawData | null;
  features: Features | null;
  years: YearEntry[];
  yearIndex: number;
  info: string;
  /** Tăng mỗi khi engine đổi trạng thái ảnh hưởng cách vẽ (hue/emphasis/frame…) → lưới vẽ lại. */
  gridVersion: number;

  /* playhead / con trỏ */
  playCol: number;
  cursor: Cursor;
  progress: string;

  /* điều khiển */
  url: string;
  speed: number;
  volume: number;
  scale: ScaleName;
  urgency: boolean;
  hueByLight: boolean;
  emphasis: boolean;
  timeline: boolean;
  tlYears: string;

  logs: LogEntry[];

  /* actions */
  log: (msg: string, tone?: LogTone) => void;
  loadMock: () => void;
  loadFromUrl: () => Promise<void>;
  checkJson: () => void;
  selectYear: (index: number) => void;

  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setSpeed: (v: number) => void;
  setVolume: (v: number) => void;
  setScale: (s: ScaleName) => void;
  setUrgency: (on: boolean) => void;
  setHueByLight: (on: boolean) => void;
  setEmphasis: (on: boolean) => void;
  setTimeline: (on: boolean) => void;
  setTlYears: (txt: string) => void;
  applyTimeline: () => void;
  setUrl: (url: string) => void;

  setCursor: (c: Cursor) => void;
  probeCell: (col: number, row: number) => Promise<void>;
  probeSwatch: (s: Swatch) => Promise<void>;
  probeImage: (img: HTMLImageElement, ev: MouseEvent) => Promise<void>;
}

export const useJukeboxStore = create<JukeboxState>()(
  subscribeWithSelector((set, get) => {
    /* ---- helpers nội bộ ---- */
    const refreshYears = () => set({ years: engine.getYears(), yearIndex: engine.frameIndex });

    const showFeatures = (label: string) => {
      const features = engine.features;
      if (!features) return;
      set((s) => ({
        features,
        cursor: { col: 0, row: 0 },
        playCol: -1,
        info: summarize(features, engine.getYears().length),
        gridVersion: s.gridVersion + 1,
      }));
      get().log(`Đã nạp: ${label}`, "ok");
    };

    const setData = (raw: RawData, label: string) => {
      set({ rawData: raw });
      engine.load(raw); // engine tự nhận định dạng mới (frames) hoặc cũ (columns)
      refreshYears();
      showFeatures(label);
    };

    /** Đổi một tuỳ chọn của engine rồi, nếu đã có dữ liệu, vẽ lại lưới + log nhãn. */
    const redrawIfLoaded = (label: string) => {
      if (engine.features) showFeatures(label);
    };

    return {
      rawData: null,
      features: null,
      years: [],
      yearIndex: 0,
      info: "Chưa nạp dữ liệu.",
      gridVersion: 0,

      playCol: -1,
      cursor: { col: 0, row: 0 },
      progress: "0%",

      url: "/data/night_lights.json",
      speed: 1,
      volume: 0.8,
      scale: "pentatonic",
      urgency: false,
      hueByLight: false,
      emphasis: false,
      timeline: false,
      tlYears: "",

      logs: [makeLog("Sẵn sàng. Bấm 'Nạp dữ liệu giả' rồi Play.", "dim")],

      /* ---------------- log ---------------- */
      log: (msg, tone = "") => set((s) => ({ logs: [...s.logs, makeLog(msg, tone)].slice(-MAX_LOGS) })),

      /* ---------------- nguồn dữ liệu ---------------- */
      loadMock: () => setData(makeMockNightLights(), "dữ liệu giả (định dạng mới, 3 năm)"),

      loadFromUrl: async () => {
        const { log } = get();
        const url = get().url.trim();
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
          const text = await res.text();
          const mb = text.length / 1048576;
          const raw = JSON.parse(text) as RawData;
          log(`Đã tải ${mb.toFixed(1)} MB`, "dim");
          if (mb > 5)
            log(
              `Cảnh báo: file ${mb.toFixed(1)} MB. Audio chỉ cần frames[].audioColumns (nhỏ hơn nhiều), nên xin Người 3 xuất bản gọn cho web.`,
              "dim",
            );
          if (Array.isArray(raw.frames)) {
            const errs = validateRaw(raw);
            if (errs.length) log(`JSON có ${errs.length} lỗi, bấm "Kiểm tra JSON" để xem. Vẫn thử nạp.`, "bad");
          }
          setData(raw, url);
        } catch (e) {
          log("Không nạp được: " + errMsg(e), "bad");
        }
      },

      checkJson: () => {
        const { rawData, log } = get();
        if (!rawData) return log("Chưa nạp dữ liệu.", "bad");
        if (!Array.isArray(rawData.frames))
          return log("Dữ liệu dạng cũ (columns), không kiểm tra theo hợp đồng mới.", "dim");

        const errs = validateRaw(rawData);
        if (!errs.length) log("JSON hợp lệ theo contracts.md ✔", "ok");
        else {
          log(`${errs.length} lỗi:`, "bad");
          errs.slice(0, 15).forEach((m) => log("  " + m, "bad"));
        }
        warningsRaw(rawData).forEach((m) => log("Cảnh báo: " + m, "dim"));
      },

      selectYear: (index) => {
        set({ yearIndex: index });
        engine.setFrame(index);
        showFeatures(`năm ${get().rawData?.frames?.[index]?.year ?? index}`);
      },

      setUrl: (url) => set({ url }),

      /* ---------------- transport ---------------- */
      play: async () => {
        if (!get().features) return get().log("Hãy nạp dữ liệu trước.", "bad");
        await engine.play();
        get().log("▶ play");
      },
      pause: () => {
        engine.pause();
        get().log("⏸ pause");
      },
      stop: () => {
        engine.stop();
        get().log("⏹ stop");
      },
      setSpeed: (v) => {
        engine.setSpeed(v);
        set({ speed: v });
      },
      setVolume: (v) => {
        engine.setVolume(v);
        set({ volume: v });
      },

      /* ---------------- tuỳ chọn ---------------- */
      setScale: (scale) => {
        engine.setScale(scale);
        set({ scale });
        get().log("Thang âm: " + scale);
      },
      setUrgency: (on) => {
        engine.setUrgencyMode(on);
        set({ urgency: on });
        get().log("Cấp bách: " + (on ? "BẬT" : "tắt"));
      },
      setHueByLight: (on) => {
        // mờ = lam đậm (230°), sáng = vàng rực (58°). Chỉ để nghe thử, chưa phải quyết định cuối.
        engine.setHueMapper(on ? (light) => 230 - 172 * light : null);
        set({ hueByLight: on });
        redrawIfLoaded(on ? "hue theo độ sáng: BẬT" : "hue cố định");
        get().log(
          "Hue theo độ sáng: " + (on ? "BẬT (mờ=lam đậm, sáng=vàng rực)" : "tắt (hue cố định 45)"),
        );
      },
      setEmphasis: (on) => {
        engine.setChangeEmphasis(on);
        set({ emphasis: on });
        redrawIfLoaded(on ? "nhấn mạnh thay đổi: BẬT" : "nhấn mạnh thay đổi: tắt");
        get().log(
          "Nhấn mạnh thay đổi: " +
            (on ? "BẬT (vàng = sáng thêm, lam = tối đi, xanh lá = nền)" : "tắt"),
        );
      },

      /* ---------------- timeline ---------------- */
      setTimeline: (on) => {
        set({ timeline: on });
        get().applyTimeline();
      },
      setTlYears: (txt) => set({ tlYears: txt }),
      applyTimeline: () => {
        const { timeline: on, tlYears, log } = get();
        let idx: number[] | null = null;
        const txt = tlYears.trim();
        if (on && txt) {
          const want = txt.split(/[\s,;]+/).map(Number);
          idx = engine.getYears().filter((y) => y.year !== undefined && want.includes(y.year)).map((y) => y.index);
        }
        engine.setTimeline(on, idx);
        refreshYears();
        redrawIfLoaded(on ? `timeline ${engine.timelineIndexes?.length ?? 0} năm` : "timeline tắt");
        log(
          on
            ? `Timeline BẬT: ${(engine.timelineIndexes ?? []).map((i) => engine.data?.frames?.[i]?.year).join(", ")}`
            : "Timeline tắt",
        );
      },

      /* ---------------- nghe thử ---------------- */
      setCursor: (cursor) => set({ cursor }),

      probeCell: async (col, row) => {
        const cell = get().features?.columns[col]?.rows[row];
        if (!cell) return;
        const v = await engine.playCell(col, row);
        if (!v) return;
        const note = cell.light > LIT_THRESHOLD ? "" : "  (ô tối, tiếng rất nhỏ)";
        get().log(
          `ô (${col},${row}) hue=${cell.hue} light=${cell.light} -> ${v.osc}, MIDI ${v.midi}, vel ${v.velocity.toFixed(2)}${note}`,
        );
      },

      probeSwatch: async ({ name, hue, sat, light }) => {
        const v = await engine.playColor({ hue, sat, light, rowFrac: 0.5 });
        get().log(
          `${name} -> ${v.label} | cutoff ${v.cutoff}Hz, Q ${v.q}, attack ${v.attack.toFixed(3)}s, FM ${v.modIndex.toFixed(2)}, vel ${v.velocity.toFixed(2)}`,
        );
      },

      probeImage: async (img, ev) => {
        const grid = { cols: 96, rows: 16, crop: [0, 0, img.naturalWidth, img.naturalHeight] } as const;
        const c = pickFromImage(img, ev, grid);
        const v = await engine.playColor(c);
        get().log(
          `pixel hue=${c.hue.toFixed(0)} sat=${c.sat.toFixed(2)} V=${c.light.toFixed(2)} ô(${c.col},${c.row}) -> ${v.osc}, MIDI ${v.midi}, vel ${v.velocity.toFixed(2)}`,
        );
      },
    };
  }),
);

/* ------------------------------------------------------------------ */
/* Nối callback của engine vào store                                    */
/* ------------------------------------------------------------------ */

/**
 * engine là singleton; onFrame / onPlayhead trả về hàm huỷ, nên gọi trong useEffect
 * và trả cleanup (an toàn với React StrictMode mount 2 lần).
 */
export function bindEngineToStore(): () => void {
  const offFrame = engine.onFrame((fi, year, change) => {
    const features = engine.features;
    useJukeboxStore.setState((s) => ({
      features,
      yearIndex: fi,
      info: features ? summarize(features, engine.getYears().length) : s.info,
      gridVersion: s.gridVersion + 1,
    }));
    useJukeboxStore
      .getState()
      .log(
        `Năm ${year}` +
          (change ? `: ${change.up} ô sáng thêm, ${change.down} ô tối đi (so với ${change.since})` : ""),
        "ok",
      );
  });

  const offPlayhead = engine.onPlayhead((i, p, info) => {
    useJukeboxStore.setState({
      playCol: i,
      progress: info
        ? `${info.year ?? ""}${info.timeline ? ` (${info.yearPos + 1}/${info.yearCount})` : ""} · cột ${i} · tổng ${(info.total * 100).toFixed(0)}%`
        : `cột ${i} · ${(p * 100).toFixed(0)}%`,
    });
  });

  return () => {
    offFrame();
    offPlayhead();
  };
}

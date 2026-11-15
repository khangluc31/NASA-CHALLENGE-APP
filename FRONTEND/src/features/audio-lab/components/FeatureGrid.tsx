import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { shallow } from "zustand/shallow";

import { engine } from "../../../../audio";
import { drawGrid } from "../lib/draw";
import { useJukeboxStore } from "../store";
import { Hint, Section } from "./ui";

export function FeatureGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Vẽ lại imperatively mỗi khi dữ liệu / playhead / con trỏ đổi.
  // Playhead bắn nhiều lần mỗi giây nên KHÔNG đi qua React render, chỉ subscribe store.
  useEffect(() => {
    const paint = () => {
      const canvas = canvasRef.current;
      const { features, playCol, cursor } = useJukeboxStore.getState();
      if (!canvas || !features) return;
      const useHue = !engine.data || !!engine.hueOf || !!engine.changeEmphasis;
      drawGrid(canvas, features, playCol, cursor, useHue);
    };
    paint();
    return useJukeboxStore.subscribe(
      (s) => [s.features, s.playCol, s.cursor, s.gridVersion] as const,
      paint,
      { equalityFn: shallow },
    );
  }, []);

  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const { features, setCursor, probeCell } = useJukeboxStore.getState();
    if (!features) return;
    const nCols = features.columns.length;
    const nRows = features.columns[0].rows.length;
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.min(nCols - 1, Math.floor(((e.clientX - r.left) / r.width) * nCols));
    const row = Math.min(nRows - 1, Math.floor(((e.clientY - r.top) / r.height) * nRows));
    setCursor({ col, row });
    void probeCell(col, row);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const { features, cursor, setCursor, probeCell, play } = useJukeboxStore.getState();
    if (!features) return;

    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      const maxC = features.columns.length - 1;
      const maxR = features.columns[0].rows.length - 1;
      const next = {
        col: Math.max(0, Math.min(maxC, cursor.col + move[0])),
        row: Math.max(0, Math.min(maxR, cursor.row + move[1])),
      };
      setCursor(next);
      void probeCell(next.col, next.row);
    } else if (e.key === " ") {
      e.preventDefault();
      void play();
    }
  };

  return (
    <Section title="3. Lưới features (bấm hoặc dùng phím mũi tên để nghe từng ô)">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Lưới features. Dùng phím mũi tên để chọn ô, Space để phát."
        className="w-full cursor-crosshair rounded-md border border-lab-line-soft bg-black [image-rendering:pixelated]"
        onClick={onClick}
        onKeyDown={onKeyDown}
      />
      <Hint>
        Ô sáng = có tiếng (light &gt; 0.12). Thang xám = độ sáng (dữ liệu mới không có màu); có màu khi bật "Hue theo
        độ sáng". Vạch trắng = playhead. Khung vàng = ô đang chọn.
      </Hint>
    </Section>
  );
}

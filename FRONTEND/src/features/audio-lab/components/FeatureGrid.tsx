import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { shallow } from "zustand/shallow";

import { engine } from "../../../../audio";
import { drawGrid } from "../lib/draw";
import { useJukeboxStore } from "../store";
import { Hint, Section } from "./ui";

/**
 * bare = true: chỉ vẽ canvas (không Section / Hint), để nhúng vào chỗ khác như DataSonification.
 */
export function FeatureGrid({ bare = false }: { bare?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Vẽ lại imperatively mỗi khi dữ liệu / playhead / con trỏ đổi.
  // Playhead bắn nhiều lần mỗi giây nên KHÔNG đi qua React render, chỉ subscribe store.
  useEffect(() => {
    const paint = () => {
      const canvas = canvasRef.current;
      const { features, playCol, cursor, adapted } = useJukeboxStore.getState();
      if (!canvas || !features) return;
      // adapted (co2 / ocean): adapter đã gán hue cho từng ô (lam = thấp, đỏ = cao) nên phải vẽ màu, không vẽ thang xám
      const useHue = !engine.data || adapted || !!engine.hueOf || !!engine.changeEmphasis;
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

  const canvas = (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="Feature grid. Use arrow keys to pick a cell, Space to play."
      className="w-full cursor-crosshair rounded-md border border-lab-line-soft bg-black [image-rendering:pixelated]"
      onClick={onClick}
      onKeyDown={onKeyDown}
    />
  );
  if (bare) return canvas;

  return (
    <Section title="3. Feature grid (click or use arrow keys to hear a cell)">
      {canvas}
      <Hint>
        Lit cell = audible (light &gt; 0.12). Grayscale = brightness (new data has no color); colored when "Hue by
        brightness" is on. White line = playhead. Yellow box = selected cell.
      </Hint>
    </Section>
  );
}
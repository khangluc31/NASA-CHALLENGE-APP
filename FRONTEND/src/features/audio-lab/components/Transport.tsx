import type { ScaleName } from "../../../../audio";
import { useJukeboxStore } from "../store";
import { btnCls, Check, fieldCls, Row, Section } from "./ui";

export function Transport() {
  const speed = useJukeboxStore((s) => s.speed);
  const volume = useJukeboxStore((s) => s.volume);
  const scale = useJukeboxStore((s) => s.scale);
  const urgency = useJukeboxStore((s) => s.urgency);
  const hueByLight = useJukeboxStore((s) => s.hueByLight);
  const emphasis = useJukeboxStore((s) => s.emphasis);
  const timeline = useJukeboxStore((s) => s.timeline);
  const tlYears = useJukeboxStore((s) => s.tlYears);
  const canTimeline = useJukeboxStore((s) => s.years.length >= 2);
  const progress = useJukeboxStore((s) => s.progress);
  const a = useJukeboxStore.getState();

  return (
    <Section title="2. Playback (scan left to right)">
      <Row>
        <button type="button" className={btnCls} onClick={() => void a.play()}>
          ▶ Play
        </button>
        <button type="button" className={btnCls} onClick={a.pause}>
          ⏸ Pause
        </button>
        <button type="button" className={btnCls} onClick={a.stop}>
          ⏹ Stop
        </button>
        <label className="inline-flex items-center gap-1.5">
          Speed
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => a.setSpeed(Number(e.target.value))}
          />
          <span>{speed.toFixed(1)}x</span>
        </label>
        <label className="inline-flex items-center gap-1.5">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => a.setVolume(Number(e.target.value))}
          />
        </label>
      </Row>

      <Row>
        <label className="inline-flex items-center gap-1.5">
          Scale
          <select className={fieldCls} value={scale} onChange={(e) => a.setScale(e.target.value as ScaleName)}>
            <option value="pentatonic">pentatonic</option>
            <option value="dorian">dorian</option>
            <option value="tension">tension (harmonic minor)</option>
          </select>
        </label>
        <Check label="Urgent mode" checked={urgency} onChange={a.setUrgency} />
        <Check
          label="Hue by brightness (try palette with night lights)"
          checked={hueByLight}
          onChange={a.setHueByLight}
        />
        <Check label="Emphasize change vs first year" checked={emphasis} onChange={a.setEmphasis} />
        <Check label="Play across years" checked={timeline} disabled={!canTimeline} onChange={a.setTimeline} />
        <input
          type="text"
          size={30}
          className={fieldCls}
          value={tlYears}
          placeholder="years to play, e.g. 2012,2015,2018,2021,2023 (empty = all)"
          aria-label="Years to play in the timeline"
          onChange={(e) => a.setTlYears(e.target.value)}
          onBlur={() => timeline && a.applyTimeline()}
          onKeyDown={(e) => e.key === "Enter" && timeline && a.applyTimeline()}
        />
        <span className="text-lab-muted">{progress}</span>
      </Row>
    </Section>
  );
}

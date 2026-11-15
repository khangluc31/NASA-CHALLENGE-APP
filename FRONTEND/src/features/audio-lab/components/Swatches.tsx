import { SWATCHES } from "../lib/swatches";
import { useJukeboxStore } from "../store";
import { Hint, Row, Section } from "./ui";

export function Swatches() {
  const probeSwatch = useJukeboxStore.getState().probeSwatch;
  return (
    <Section title="4. Click a color to hear it">
      <Row>
        {SWATCHES.map((sw) => (
          <button
            key={sw.name}
            type="button"
            title={sw.name}
            aria-label={`Color ${sw.name}`}
            style={{ background: `hsl(${sw.hue} ${sw.sat * 100}% ${sw.light * 55}%)` }}
            className="h-12 w-[78px] cursor-pointer rounded-md border-2 border-white/20 text-[11px] text-white [text-shadow:0_0_3px_#000]"
            onClick={() => void probeSwatch(sw)}
          >
            {sw.name.split(" ")[0]}
          </button>
        ))}
      </Row>
      <Hint>
        10 color anchors, smoothly interpolated in between. Low-saturation "cloud" colors add a wind layer. The log
        shows voice name, cutoff, Q, attack, FM.
      </Hint>
    </Section>
  );
}

import { SWATCHES } from "../lib/swatches";
import { useJukeboxStore } from "../store";
import { Hint, Row, Section } from "./ui";

export function Swatches() {
  const probeSwatch = useJukeboxStore.getState().probeSwatch;
  return (
    <Section title="4. Bấm màu để nghe">
      <Row>
        {SWATCHES.map((sw) => (
          <button
            key={sw.name}
            type="button"
            title={sw.name}
            aria-label={`Màu ${sw.name}`}
            style={{ background: `hsl(${sw.hue} ${sw.sat * 100}% ${sw.light * 55}%)` }}
            className="h-12 w-[78px] cursor-pointer rounded-md border-2 border-white/20 text-[11px] text-white [text-shadow:0_0_3px_#000]"
            onClick={() => void probeSwatch(sw)}
          >
            {sw.name.split(" ")[0]}
          </button>
        ))}
      </Row>
      <Hint>
        10 điểm neo màu của audio.js, nội suy mượt ở giữa. "Mây" có độ bão hòa thấp nên pha thêm tiếng gió. Nhật ký in
        tên giọng, cutoff, Q, attack, FM.
      </Hint>
    </Section>
  );
}

import { useJukeboxStore } from "../store";
import { btnCls, fieldCls, Row, Section } from "./ui";

const BASE = import.meta.env.BASE_URL;
const JSON_OPTIONS = [
  { label: "Night Lights", value: `${BASE}data/night-lights/night_lights.json` },
  { label: "Ocean", value: `${BASE}data/ocean/ocean.json` },
  { label: "Diamond CO2", value: `${BASE}data/carbon-dioxide/co2.json` },
];

export function DataSource() {
  const info = useJukeboxStore((s) => s.info);
  const years = useJukeboxStore((s) => s.years);
  const yearIndex = useJukeboxStore((s) => s.yearIndex);
  const timeline = useJukeboxStore((s) => s.timeline);
  const url = useJukeboxStore((s) => s.url);
  // selectDataset(url) đặt url vào store RỒI nạp luôn, nên đổi dropdown là tải ngay.
  const { loadMock, selectDataset, selectYear } = useJukeboxStore.getState();

  const known = JSON_OPTIONS.some((opt) => opt.value === url);

  return (
    <Section title="1. Data source">
      <Row>
        <button type="button" className={btnCls} onClick={loadMock}>
          Load mock data
        </button>
        <select
          className={fieldCls}
          value={known ? url : ""}
          onChange={(e) => void selectDataset(e.target.value)}
          aria-label="Features JSON file"
        >
          {!known && <option value="" disabled>Choose a dataset…</option>}
          {JSON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {years.length > 0 && (
          <select
            className={fieldCls}
            value={yearIndex}
            disabled={timeline}
            onChange={(e) => selectYear(Number(e.target.value))}
            aria-label="Choose year"
          >
            {years.map(({ index, year }) => (
              <option key={index} value={index}>
                {year ?? `Part ${index + 1}`}
              </option>
            ))}
          </select>
        )}
      </Row>
      <div className="text-lab-muted">{info}</div>
    </Section>
  );
}

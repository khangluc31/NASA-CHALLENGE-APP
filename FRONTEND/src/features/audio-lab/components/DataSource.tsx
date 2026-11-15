import { useJukeboxStore } from "../store";
import { btnCls, fieldCls, Row, Section } from "./ui";

const JSON_OPTIONS = [
  { label: "Night Lights", value: "/data/night_lights.json" },
  { label: "Ocean", value: "/data/ocean.json" },
  { label: "Diamond CO2", value: "/data/co2.json" },
];

export function DataSource() {
  const info = useJukeboxStore((s) => s.info);
  const years = useJukeboxStore((s) => s.years);
  const yearIndex = useJukeboxStore((s) => s.yearIndex);
  const timeline = useJukeboxStore((s) => s.timeline);
  // url nằm trong STORE (không dùng useState cục bộ): loadFromUrl() đọc url từ store,
  // nếu để state cục bộ thì chọn Ocean/CO2 xong nút "Nạp" vẫn nạp night_lights.
  const url = useJukeboxStore((s) => s.url);
  const { loadMock, loadFromUrl, selectYear, setUrl } = useJukeboxStore.getState();
  return (
    <Section title="1. Nguồn dữ liệu">
      <Row>
        <button type="button" className={btnCls} onClick={loadMock}>
          Nạp dữ liệu giả (mock)
        </button>
        <select
          className={fieldCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Đường dẫn file features JSON"
        >
          {JSON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="button" className={btnCls} onClick={() => void loadFromUrl()}>
          Nạp file JSON
        </button>
        {years.length > 0 && (
          <select
            className={fieldCls}
            value={yearIndex}
            disabled={timeline}
            onChange={(e) => selectYear(Number(e.target.value))}
            aria-label="Chọn năm"
          >
            {years.map(({ index, year }) => (
              <option key={index} value={index}>
                {year ?? `Đoạn ${index + 1}`}
              </option>
            ))}
          </select>
        )}
      </Row>
      <div className="text-lab-muted">{info}</div>
    </Section>
  );
}
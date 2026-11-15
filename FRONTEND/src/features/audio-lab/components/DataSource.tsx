import { useJukeboxStore } from "../store";
import { btnCls, fieldCls, Row, Section } from "./ui";

export function DataSource() {
  const url = useJukeboxStore((s) => s.url);
  const info = useJukeboxStore((s) => s.info);
  const years = useJukeboxStore((s) => s.years);
  const yearIndex = useJukeboxStore((s) => s.yearIndex);
  const timeline = useJukeboxStore((s) => s.timeline);
  const { loadMock, loadFromUrl, checkJson, selectYear, setUrl } = useJukeboxStore.getState();

  return (
    <Section title="1. Nguồn dữ liệu">
      <Row>
        <button type="button" className={btnCls} onClick={loadMock}>
          Nạp dữ liệu giả (mock)
        </button>
        <input
          type="text"
          size={28}
          className={fieldCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Đường dẫn file features JSON"
        />
        <button type="button" className={btnCls} onClick={() => void loadFromUrl()}>
          Nạp file JSON
        </button>
        <button type="button" className={btnCls} onClick={checkJson}>
          Kiểm tra JSON
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
                {year}
              </option>
            ))}
          </select>
        )}
      </Row>
      <div className="text-lab-muted">{info}</div>
    </Section>
  );
}

import { useEffect, useRef } from "react";

import { useJukeboxStore, type LogTone } from "../store";
import { Section } from "./ui";

const TONE_CLASS: Record<LogTone, string> = {
  ok: "text-lab-ok",
  bad: "text-lab-bad",
  dim: "text-lab-muted",
  "": "",
};

export function LogPanel() {
  const logs = useJukeboxStore((s) => s.logs);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <Section title="Nhật ký">
      <div
        ref={ref}
        role="log"
        aria-live="polite"
        className="h-[200px] overflow-auto rounded-md border border-lab-log-line bg-lab-log p-2 font-mono text-[12.5px] leading-[1.45] whitespace-pre-wrap"
      >
        {logs.map((l) => (
          <div key={l.id} className={TONE_CLASS[l.tone]}>
            {l.time}  {l.msg}
          </div>
        ))}
      </div>
    </Section>
  );
}

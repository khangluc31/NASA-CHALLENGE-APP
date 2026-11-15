import type { ReactNode } from "react";

/** Class dùng chung cho button / select / input text (khớp style của prototype). */
const control = "rounded-md border border-lab-line bg-lab-surface px-3 py-2 text-inherit";
export const btnCls = `${control} cursor-pointer hover:bg-lab-surface-hover disabled:cursor-not-allowed disabled:opacity-50`;
export const fieldCls = `${control} disabled:opacity-50`;

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mt-[22px] mb-2 text-[15px] font-bold text-lab-heading">{title}</h2>
      {children}
    </section>
  );
}

export function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`my-1.5 flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <small className="text-lab-muted">{children}</small>;
}

export function Check({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

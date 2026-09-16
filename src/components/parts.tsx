import type { LedgerRow, Position, QueueItem, QueueText } from "../types.ts";
import { STATE_CLS } from "../data.ts";

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={onClick}
      style={{ paddingLeft: 0, alignSelf: "flex-start" }}
      aria-label={label}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: 2 }}>
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function PayRusLogo({
  className,
  size = 140,
  onClick,
  alt = "PayRus — Integrated Payment Solutions & Services",
  homeLabel = "PayRus home",
}: {
  className?: string;
  size?: number;
  onClick?: () => void;
  alt?: string;
  homeLabel?: string;
}) {
  const img = (
    <img
      src="/payrus-logo.png"
      alt={alt}
      className={className}
      style={{ width: size, mixBlendMode: "multiply" }}
      draggable={false}
    />
  );
  if (!onClick) return img;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={homeLabel}
      style={{ background: "none", border: 0, padding: 0, margin: 0, cursor: "pointer", display: "inline-flex" }}
    >
      {img}
    </button>
  );
}

export function SegGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((opt) => (
        <label key={opt.value} className="seg-opt">
          <input
            type="radio"
            name={label}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  accent: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: "var(--font-heading-weight)" as unknown as number,
          fontSize: 32,
          letterSpacing: "-0.015em",
          lineHeight: 1.12,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: accent ? "var(--color-accent-2-700)" : "var(--color-neutral-600)", marginTop: 2 }}>
        {delta}
      </div>
    </div>
  );
}

export function BarChart({ bars }: { bars: { label: string; h: string; fill: string; value: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
      {bars.map((b) => (
        <div key={b.label} style={{ flex: "1 1 0", minWidth: 0, display: "grid", gridTemplateRows: "18px 170px auto", rowGap: "var(--space-2)" }}>
          <div style={{ fontSize: 11, color: "var(--color-neutral-600)", textAlign: "center", fontVariantNumeric: "tabular-nums", alignSelf: "end" }}>
            {b.value}
          </div>
          <div style={{ height: 170, display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", flex: "0 0 auto", minHeight: 0, height: b.h, background: b.fill, borderRadius: "var(--radius-sm)" }} />
          </div>
          <div style={{ fontSize: 13, color: "var(--color-neutral-700)", textAlign: "center", lineHeight: 1.25 }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

export function LedgerTable({
  cols,
  rows,
  states,
  emptyText,
}: {
  cols: { label: string; align: "left" | "right" }[];
  rows: LedgerRow[];
  states: Record<string, string>;
  emptyText: string;
}) {
  return (
    <table className="table" style={{ marginTop: "var(--space-4)", width: "100%" }}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.label} style={{ textAlign: c.align }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name + i}>
            <td>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>{r.meta}</div>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>{r.corridor}</td>
            <td>{r.rail}</td>
            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.amount}</td>
            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "var(--color-neutral-600)" }}>
              {r.fee}
            </td>
            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <span className={`tag ${STATE_CLS[r.state]}`}>{states[r.state] ?? r.state}</span>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} style={{ paddingTop: "var(--space-4)", paddingBottom: "var(--space-4)", color: "var(--color-neutral-600)" }}>
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function PositionCard({ title, total, pockets, note }: { title: string; total: string; pockets: Position["pockets"]; note: string }) {
  return (
    <div className="card elev-sm">
      <div className="card-kicker">{title}</div>
      <div className="card-title">{total}</div>
      <div className="card-body">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
          {pockets.map(([code, amt, pct, g], i) => (
            <div key={code + i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{ width: 46, fontWeight: 600, letterSpacing: "0.04em" }}>{code}</div>
              <div style={{ flex: 1, height: 8, background: "var(--color-neutral-200)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <div style={{ width: pct, height: "100%", background: g ? "var(--color-accent-2-500)" : "var(--color-accent-500)" }} />
              </div>
              <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{amt}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-meta">{note}</div>
    </div>
  );
}

export function QueueCard({ item }: { item: QueueText & { cls: QueueItem["cls"] } }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div style={{ fontWeight: 600 }}>{item.title}</div>
        <span className={`tag ${item.cls}`}>{item.badge}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--color-neutral-600)", marginTop: 2, lineHeight: 1.5 }}>{item.note}</div>
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
        <button type="button" className="btn btn-primary">
          {item.primary}
        </button>
        <button type="button" className="btn btn-ghost">
          {item.secondary}
        </button>
      </div>
    </div>
  );
}

export function FxTable({ title, rows }: { title: string; rows: { pair: string; rate: string; note: string }[] }) {
  return (
    <div>
      <h4 style={{ margin: "0 0 var(--space-4)" }}>{title}</h4>
      <table className="table" style={{ width: "100%" }}>
        <tbody>
          {rows.map((f) => (
            <tr key={f.pair}>
              <td>{f.pair}</td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{f.rate}</td>
              <td style={{ textAlign: "right", fontSize: 13, color: "var(--color-neutral-600)" }}>{f.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

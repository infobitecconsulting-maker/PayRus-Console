import type { Desk, Role, TabKey } from "../types.ts";
import { CAPS, ROLE_ORDER, TAB_KEYS } from "../data.ts";
import { BackButton } from "../components/parts.tsx";

export function ProfilePicker({
  D,
  onBack,
  onPick,
}: {
  D: Desk;
  onBack: () => void;
  onPick: (role: Role) => void;
}) {
  return (
    <div style={{ flex: 1, padding: "var(--space-8) var(--space-6)", maxWidth: 1100, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
      <BackButton label={D.back} onClick={onBack} />
      <h1 style={{ margin: "var(--space-4) 0 var(--space-2)" }}>{D.chooseProfile}</h1>
      <p style={{ margin: "0 0 var(--space-6)", maxWidth: "40em", fontSize: 16, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
        {D.chooseProfileNote}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-4)" }}>
        {ROLE_ORDER.map((key, i) => (
          <div key={key} className="card elev-sm" style={{ cursor: "pointer" }} role="button" tabIndex={0} onClick={() => onPick(key)}>
            <div className="card-kicker">{D.roleLabel}</div>
            <div className="card-title">{D.roles[i] ?? key}</div>
            <div className="card-body">{D.roleNotes[i] ?? ""}</div>
            <div className="card-meta">
              {(CAPS[key] ?? []).map((k: TabKey) => D.tabs[TAB_KEYS.indexOf(k)]).filter(Boolean).join(" · ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { Desk, Role, TabKey } from "../types.ts";
import { TAB_KEYS } from "../data.ts";
import { fetchRolesAndCaps } from "../lib/backend.ts";
import { BackButton } from "../components/parts.tsx";

export function ProfilePicker({
  D,
  onBack,
  onPick,
  onPickAdmin,
}: {
  D: Desk;
  onBack: () => void;
  onPick: (role: Role) => void;
  onPickAdmin: (password: string) => Promise<void>;
}) {
  const [adminPassword, setAdminPassword] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const unlockAdmin = async () => {
    if (!adminPassword || adminBusy) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      await onPickAdmin(adminPassword);
    } catch {
      setAdminError(D.adminWrongPassword);
    } finally {
      setAdminBusy(false);
    }
  };
  const [rolesAndCaps, setRolesAndCaps] = useState<{ roleOrder: Role[]; caps: Record<Role, TabKey[]> } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRolesAndCaps()
      .then((r) => { if (!cancelled) setRolesAndCaps(r); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ flex: 1, padding: "var(--space-8) var(--space-6)", maxWidth: 1100, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
      <BackButton label={D.back} onClick={onBack} />
      <h1 style={{ margin: "var(--space-4) 0 var(--space-2)" }}>{D.chooseProfile}</h1>
      <p style={{ margin: "0 0 var(--space-6)", maxWidth: "40em", fontSize: 16, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
        {D.chooseProfileNote}
      </p>
      {loadError && <div className="tag tag-accent">Couldn't load profiles: {loadError}</div>}
      {!loadError && !rolesAndCaps && <div className="tag tag-neutral">Loading…</div>}
      {rolesAndCaps && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-4)" }}>
          {rolesAndCaps.roleOrder.map((key, i) => (
            <div key={key} className="card elev-sm" style={{ cursor: "pointer" }} role="button" tabIndex={0} onClick={() => onPick(key)}>
              <div className="card-kicker">{D.roleLabel}</div>
              <div className="card-title">{D.roles[i] ?? key}</div>
              <div className="card-body">{D.roleNotes[i] ?? ""}</div>
              <div className="card-meta">
                {(rolesAndCaps.caps[key] ?? []).map((k: TabKey) => D.tabs[TAB_KEYS.indexOf(k)]).filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
          <div className="card elev-sm">
            <div className="card-kicker">{D.roleLabel}</div>
            <div className="card-title">{D.adminRoleTitle}</div>
            <div className="card-body">{D.adminRoleNote}</div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
              <input
                id="admin-role-password"
                type="password"
                className="input"
                style={{ flex: 1, minWidth: 140 }}
                value={adminPassword}
                placeholder={D.adminPasswordLabel}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void unlockAdmin(); }}
              />
              <button type="button" className="btn btn-primary" disabled={adminBusy || !adminPassword} onClick={() => void unlockAdmin()}>
                {D.adminUnlock}
              </button>
            </div>
            {adminError && <div className="tag tag-accent" style={{ marginTop: "var(--space-2)" }}>{adminError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

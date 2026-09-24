import { useEffect, useState } from "react";
import type { AdminPageCopy } from "../types.ts";
import {
  APP_FEATURES, CONSOLE_ROLES, CONSOLE_TABS, createProfile, errorText, listAuditEvents, listConsoleTabs, listProfileFeatures, listRoleSlugs,
  reassignRole, removeRole, setConsoleTabs, setGatePassword, setProfileFeatures, type AuditEvent, type StaffUser,
} from "../lib/adminStaff.ts";

type Notify = (message: string) => void;

const short = (v: unknown) => {
  const s = JSON.stringify(v);
  return s && s.length > 400 ? `${s.slice(0, 400)}…` : s ?? "—";
};

export function AuditTab({ A }: { A: AdminPageCopy }) {
  const TABLES = ["", "user_roles", "users", "transfers", "support_escalations", "support_permissions", "gate_passwords", "profile_features", "console_role_tabs", "fx_margin_config", "expense_reports"];
  const [table, setTable] = useState("");
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    setEvents(null);
    void listAuditEvents(table || undefined).then((e) => { setEvents(e); setDenied(false); }).catch(() => { setEvents([]); setDenied(true); });
  }, [table]);

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select className="input" aria-label={A.tabAudit} style={{ width: "auto" }} value={table} onChange={(e) => setTable(e.target.value)}>
          {TABLES.map((t) => <option key={t} value={t}>{t || A.allTables}</option>)}
        </select>
        <span className="text-muted" style={{ fontSize: 12 }}>{A.auditNote}</span>
      </div>
      {events === null && <div className="tag tag-neutral">{A.loading}</div>}
      {denied && <div className="tag tag-neutral">{A.auditDenied}</div>}
      {events && !denied && events.length === 0 && <div className="text-muted">{A.empty}</div>}
      {events?.map((e) => (
        <div key={e.seq} className="card elev-sm" style={{ gap: 4 }}>
          <button type="button" onClick={() => setOpen(open === e.seq ? null : e.seq)} style={{ all: "unset", cursor: "pointer", display: "grid", gap: 2 }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ fontFamily: "monospace", fontSize: 13 }}>{e.action}</strong>
              <span className="text-muted" style={{ fontSize: 12 }}>{new Date(e.occurredAt).toLocaleString()}</span>
            </span>
            <span className="text-muted" style={{ fontSize: 12 }}>{e.actorName ?? e.actorEmail ?? e.actorLabel}{e.reason ? ` · ${e.reason}` : ""}</span>
          </button>
          {open === e.seq && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, fontFamily: "monospace", fontSize: 11 }}>
              <div><div className="text-muted">{A.auditBefore}</div><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>{short(e.beforeData)}</pre></div>
              <div><div className="text-muted">{A.auditAfter}</div><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>{short(e.afterData)}</pre></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CheckGrid({ items, checked, onToggle }: { items: { key: string; label: string }[]; checked: Set<string>; onToggle: (key: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6 }}>
      {items.map((i) => (
        <label key={i.key} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, textTransform: "capitalize" }}>
          <input type="checkbox" checked={checked.has(i.key)} onChange={() => onToggle(i.key)} /> {i.label}
        </label>
      ))}
    </div>
  );
}

export function AccessTab({ A, users, notify, reload }: { A: AdminPageCopy; users: StaffUser[]; notify: Notify; reload: () => void }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [profileType, setProfileType] = useState("personal");
  const [features, setFeatures] = useState<Set<string> | null>(null);
  const [role, setRole] = useState(CONSOLE_ROLES[0]);
  const [tabs, setTabs] = useState<Set<string> | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("personal");
  const [pw, setPw] = useState("");

  useEffect(() => { void listRoleSlugs().then((r) => setSlugs(r.map((x) => x.slug))).catch(() => setSlugs([])); }, []);
  useEffect(() => { setFeatures(null); void listProfileFeatures(profileType).then((f) => setFeatures(new Set(f))).catch(() => setFeatures(new Set())); }, [profileType]);
  useEffect(() => { setTabs(null); void listConsoleTabs(role).then((t) => setTabs(new Set(t))).catch(() => setTabs(new Set())); }, [role]);

  const toggle = (set: Set<string> | null, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set ?? []);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  };
  const guarded = async (action: (password: string) => Promise<void>, ok: string) => {
    const password = pw || window.prompt(A.passwordPrompt);
    if (!password) return;
    try { await action(password); notify(ok); setPw(""); reload(); } catch (e) { notify(errorText(e, A.adminOnly)); }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div className="card elev-sm" style={{ gap: 8 }}>
        <div className="card-title">{A.accessFeaturesTitle}</div>
        <p className="card-body">{A.accessFeaturesNote}</p>
        <select className="input" aria-label={A.accessFeaturesTitle} style={{ width: "auto" }} value={profileType} onChange={(e) => setProfileType(e.target.value)}>
          {slugs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {features === null ? <div className="tag tag-neutral">{A.loading}</div> : <CheckGrid items={APP_FEATURES} checked={features} onToggle={(k) => toggle(features, setFeatures, k)} />}
        <div><button type="button" className="btn btn-primary" disabled={!features} onClick={() => void guarded((p) => setProfileFeatures(profileType, [...(features ?? [])], p), A.saved)}>{A.gateChange}</button></div>
      </div>

      <div className="card elev-sm" style={{ gap: 8 }}>
        <div className="card-title">{A.accessConsoleTitle}</div>
        <p className="card-body">{A.accessConsoleNote}</p>
        <select className="input" aria-label={A.accessConsoleTitle} style={{ width: "auto" }} value={role} onChange={(e) => setRole(e.target.value)}>
          {CONSOLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {tabs === null ? <div className="tag tag-neutral">{A.loading}</div> : <CheckGrid items={CONSOLE_TABS.map((t) => ({ key: t, label: t }))} checked={tabs} onToggle={(k) => toggle(tabs, setTabs, k)} />}
        <div><button type="button" className="btn btn-primary" disabled={!tabs} onClick={() => void guarded((p) => setConsoleTabs(role, [...(tabs ?? [])], p), A.saved)}>{A.gateChange}</button></div>
      </div>

      <div className="card elev-sm" style={{ gap: 8 }}>
        <div className="card-title">{A.accessRolesTitle}</div>
        <p className="card-body">{A.accessRolesNote}</p>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="access-pw">{A.gateCurrent}</label>
          <input id="access-pw" className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {users.map((u) => (
          <div key={u.id} style={{ borderTop: "1px solid var(--color-neutral-200, #E3E8EE)", paddingTop: 8 }}>
            <strong>{u.name ?? u.email ?? u.id}</strong>
            {u.roles.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ minWidth: 140, textTransform: "capitalize" }}>{r.role.replace("_", " ")}</span>
                <button type="button" className="btn btn-ghost" onClick={() => { setManaging(managing === r.id ? null : r.id); setNewRole(r.role); }}>{A.manage}</button>
                {managing === r.id && (
                  <>
                    <select className="input" aria-label={A.reassign} style={{ width: "auto" }} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                      {slugs.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="button" className="btn btn-primary" disabled={!pw} onClick={() => void guarded((p) => reassignRole(r.id, newRole, p), A.reassign)}>{A.reassign}</button>
                    <button type="button" className="btn btn-ghost" disabled={!pw} onClick={() => void guarded((p) => removeRole(r.id, p), A.remove)}>{A.remove}</button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GatePassword({ A, notify }: { A: AdminPageCopy; notify: Notify }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return (
    <div className="card elev-sm" style={{ gap: 8 }}>
      <div className="card-title">{A.gateTitle}</div>
      <p className="card-body">{A.gateNote}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" type="password" aria-label={A.gateCurrent} placeholder={A.gateCurrent} style={{ flex: 1, minWidth: 160 }} value={current} onChange={(e) => setCurrent(e.target.value)} />
        <input className="input" type="password" aria-label={A.gateNew} placeholder={A.gateNew} style={{ flex: 1, minWidth: 160 }} value={next} onChange={(e) => setNext(e.target.value)} />
        <button
          type="button" className="btn btn-primary" disabled={!current || next.length < 4}
          onClick={() => void setGatePassword(current, next).then(() => { notify(A.gateChanged); setCurrent(""); setNext(""); }).catch((e) => notify(errorText(e, A.adminOnly)))}
        >{A.gateChange}</button>
      </div>
    </div>
  );
}

export function AddProfile({ A, notify, reload }: { A: AdminPageCopy; notify: Notify; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("personal");
  const [kind, setKind] = useState<"individual" | "organisation">("individual");
  const [slugs, setSlugs] = useState<{ slug: string; isAdmin: boolean }[]>([]);
  useEffect(() => { if (open && slugs.length === 0) void listRoleSlugs().then(setSlugs).catch(() => setSlugs([])); }, [open, slugs.length]);
  // Admin-tier roles are granted from the Staff tab (superadmin), never created here.
  const creatable = slugs.filter((s) => !s.isAdmin);

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(!open)}>{A.addProfile}</button>
      {open && (
        <div className="card elev-sm" style={{ gap: 8, marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            <div className="field"><label>{A.name}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>{A.roleLabel}</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{creatable.map((s) => <option key={s.slug} value={s.slug}>{s.slug}</option>)}</select>
            </div>
            <div className="field"><label>Type</label>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "individual" | "organisation")}>
                <option value="individual">{A.kindIndividual}</option><option value="organisation">{A.kindOrganisation}</option>
              </select>
            </div>
          </div>
          <div>
            <button type="button" className="btn btn-primary" disabled={!name.trim() || !email.includes("@")}
              onClick={() => void createProfile({ name: name.trim(), email: email.trim(), role, kind }).then(() => { notify(A.created); setOpen(false); setName(""); setEmail(""); reload(); }).catch((e) => notify(errorText(e, A.adminOnly)))}
            >{A.create}</button>
          </div>
        </div>
      )}
    </div>
  );
}

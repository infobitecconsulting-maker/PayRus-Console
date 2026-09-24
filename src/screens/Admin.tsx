import { useCallback, useEffect, useState } from "react";
import type { AdminPageCopy, Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import {
  getMyPermissions, listUsers, updateUser, listTransfers, requestEscalation, completeTransfer, resolveTransfer, voidTransfer, createAdjustment,
  listStaffRoles, listMatrix, setPermission, assignStaffRole, revokeStaffRole,
  errorText, type MyPermissions, type StaffUser, type StaffTransfer, type StaffRole, type MatrixRow, type EscalationAction,
  updateRoleStatus,
} from "../lib/adminStaff.ts";
import { AccessTab, AddProfile, AuditTab, GatePassword } from "./AdminExtras.tsx";
import { EscalationsTab } from "./AdminEscalations.tsx";

type TabId = "users" | "transactions" | "escalations" | "staff" | "access" | "audit";

const COMPLETABLE = ["pending", "failed", "submitted", "confirming", "partner_accepted"];
const REFUNDABLE = ["disputed", "refund_pending", "reversed"];
const VOIDABLE = ["draft", "quoted"];
const ACTIONS = ["create", "read", "update", "delete"] as const;
const RESOURCES = ["transactions", "users"] as const;
const LOCKED_CELLS = new Set(["users:create", "users:delete"]);

const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg });
const STATE_CHIP: Record<string, ReturnType<typeof chip>> = {
  paid: chip("#DDF3E8", "#1B6B45"), done: chip("#DDF3E8", "#1B6B45"), approved: chip("#DDF3E8", "#1B6B45"),
  pending: chip("#FFF1D6", "#8A5A00"), open: chip("#FFF1D6", "#8A5A00"), refund_pending: chip("#FFF1D6", "#8A5A00"),
  failed: chip("#FBE0E4", "#A3243B"), disputed: chip("#FBE0E4", "#A3243B"), rejected: chip("#FBE0E4", "#A3243B"),
};

function Escalate({ A, userId, userLabel, transfer, onDone, notify }: {
  A: AdminPageCopy; userId: string; userLabel: string; transfer?: StaffTransfer; onDone: () => void; notify: (m: string) => void;
}) {
  const all: { value: EscalationAction; label: string; needsTx: boolean }[] = [
    { value: "complete", label: A.complete, needsTx: true }, { value: "refund", label: A.refund, needsTx: true },
    { value: "close_dispute", label: A.closeDispute, needsTx: true }, { value: "void", label: A.voidTx, needsTx: true },
    { value: "adjustment", label: A.creditUser, needsTx: false }, { value: "profile_edit", label: A.edit, needsTx: false },
    { value: "other", label: "…", needsTx: false },
  ];
  const options = all.filter((o) => !o.needsTx || transfer);
  const [action, setAction] = useState<EscalationAction>(options[0]?.value ?? "other");
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(transfer?.currency ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await requestEscalation({
        targetUserId: userId, action, details, transferId: options.find((o) => o.value === action)?.needsTx ? transfer?.id : undefined,
        amount: action === "adjustment" ? Number(amount) : undefined, currency: action === "adjustment" ? currency.trim().toUpperCase() : undefined,
      });
      notify(A.sendEscalation);
      onDone();
    } catch (e) {
      notify(errorText(e, A.sendEscalation));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8, padding: 12, borderRadius: 10, background: "var(--color-neutral-100, #F1F4F7)" }}>
      <div className="text-muted" style={{ fontSize: 12 }}>{A.escalate}: <strong>{userLabel}</strong>{transfer ? ` · ${transfer.reference}` : ""}</div>
      <div className="field">
        <label>{A.requestedChange}</label>
        <select className="input" value={action} onChange={(e) => setAction(e.target.value as EscalationAction)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {action === "adjustment" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="field"><label>{A.amountPrompt}</label><input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="field"><label>{A.currency}</label><input className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
        </div>
      )}
      <div className="field">
        <label>{A.userReported}</label>
        <textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>{A.close}</button>
        <button type="button" className="btn btn-primary" disabled={busy || details.trim().length < 3} onClick={() => void submit()}>{A.sendEscalation}</button>
      </div>
    </div>
  );
}

export function Admin({ D, locale, setLocale, onBack, onLogoClick }: {
  D: Desk; locale: Locale; setLocale: (l: Locale) => void; onBack: () => void; onLogoClick: () => void;
}) {
  const A = D.adminPage;
  const [perms, setPerms] = useState<MyPermissions | null>(null);
  const [tab, setTab] = useState<TabId>("users");
  const [message, setMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [transfers, setTransfers] = useState<StaffTransfer[] | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [callerId, setCallerId] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [escalateKey, setEscalateKey] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", country: "", currency: "", kyc: "unverified" as StaffUser["kycStatus"] });
  const [assignUser, setAssignUser] = useState("");
  const [assignRole, setAssignRole] = useState("support_agent");
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const fail = (e: unknown) => setMessage(errorText(e, A.noAccess));

  useEffect(() => { void getMyPermissions().then(setPerms).catch(() => setPerms(null)); }, [tick]);
  useEffect(() => { void listUsers().then(setUsers).catch((e) => { setUsers([]); fail(e); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tick]);
  useEffect(() => { void listTransfers(callerId || undefined).then(setTransfers).catch((e) => { setTransfers([]); fail(e); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tick, callerId]);
  useEffect(() => { void listStaffRoles().then(setRoles).catch(() => setRoles([])); void listMatrix().then(setMatrix).catch(() => setMatrix([])); }, [tick]);

  const run = async (action: () => Promise<void>, ok: string) => {
    setMessage(null);
    try {
      await action();
      setMessage(ok);
      reload();
    } catch (e) {
      fail(e);
    }
  };

  const q = search.trim().toLowerCase();
  const shownUsers = (users ?? []).filter((u) => !q || [u.name, u.email, u.username, u.id, ...u.roles.map((r) => r.role)].some((v) => (v ?? "").toLowerCase().includes(q)));
  const shownTransfers = (transfers ?? []).filter((t) => !q || [t.reference, t.userName, t.userEmail, t.type, t.state, t.currency, t.note].some((v) => (v ?? "").toLowerCase().includes(q)));
  const staffSlugs = new Set(roles.map((r) => r.slug));
  const staffRows = (users ?? []).flatMap((u) => u.roles.filter((r) => staffSlugs.has(r.role)).map((r) => ({ user: u, role: r.role })));
  const canUpdate = perms?.transactions.update ?? false;
  const canDelete = perms?.transactions.delete ?? false;
  const canCreate = perms?.transactions.create ?? false;
  const isSuper = perms?.isSuperadmin ?? false;
  const label = (u: StaffUser | StaffTransfer) => ("userName" in u ? u.userName ?? u.userEmail ?? u.userId : u.name ?? u.email ?? u.id);

  const startEdit = (u: StaffUser) => {
    setEditingId(editingId === u.id ? null : u.id);
    setDraft({ name: u.name ?? "", phone: u.phone ?? "", country: u.country ?? "", currency: u.defaultCurrency ?? "", kyc: u.kycStatus });
  };

  const tabBtn = (id: TabId, text: string) => (
    <button key={id} type="button" className={tab === id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab(id)}>{text}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />
        </div>
        <div className="pr-ids">
          <LocaleMenu value={locale} onChange={setLocale} variant="console" />
          <BackButton label={D.back} onClick={onBack} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 980, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{A.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{A.subtitle}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          {tabBtn("users", A.tabUsers)}{tabBtn("transactions", A.tabTransactions)}{tabBtn("escalations", A.tabEscalations)}{tabBtn("staff", A.tabStaff)}
          {perms?.isAdmin && tabBtn("access", A.tabAccess)}{perms?.isAdmin && tabBtn("audit", A.tabAudit)}
        </div>

        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}

        {(tab === "users" || tab === "transactions") && (
          <div className="field" style={{ marginBottom: "var(--space-3)" }}>
            <input className="input" aria-label={A.search} placeholder={A.search} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        {tab === "users" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {perms?.isAdmin && perms.users.update && <AddProfile A={A} notify={setMessage} reload={reload} />}
            {users === null && <div className="tag tag-neutral">{A.loading}</div>}
            {users && shownUsers.length === 0 && <div className="text-muted">{A.empty}</div>}
            {shownUsers.map((u) => (
              <div key={u.id} className="card elev-sm" style={{ gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="card-title">{u.name ?? "—"}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{u.email ?? "—"}{u.username ? ` · @${u.username}` : ""}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {u.roles.map((r) => perms?.users.update ? (
                        <span key={r.id} style={{ ...chip("#E7EEF7", "#1D3F6B"), display: "inline-flex", gap: 4, alignItems: "center" }}>
                          {r.role.replace("_", " ")}
                          <select aria-label={`${A.roleStatus}: ${r.role}`} value={r.status} style={{ font: "inherit", border: 0, background: "transparent", color: "inherit" }}
                            onChange={(e) => void run(() => updateRoleStatus(r.id, e.target.value as "incomplete" | "pending_verification" | "verified"), A.saved)}>
                            <option value="incomplete">incomplete</option><option value="pending_verification">pending verification</option><option value="verified">verified</option>
                          </select>
                        </span>
                      ) : <span key={r.id} style={chip("#E7EEF7", "#1D3F6B")}>{r.role.replace("_", " ")} · {r.status.replace("_", " ")}</span>)}
                      <span style={chip("#F1F4F7", "#4A5A6A")}>KYC {u.kycStatus}</span>
                    </div>
                    {u.wallets.length > 0 && <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{A.walletsLabel}: {u.wallets.map((w) => `${w.balance.toLocaleString()} ${w.currency}`).join(" · ")}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => { setCallerId(u.id); setTab("transactions"); }}>{A.tabTransactions}</button>
                    {perms?.users.update && <button type="button" className="btn btn-ghost" onClick={() => startEdit(u)}>{editingId === u.id ? A.close : A.edit}</button>}
                    {!perms?.users.update && <button type="button" className="btn btn-ghost" onClick={() => setEscalateKey(escalateKey === `u:${u.id}` ? null : `u:${u.id}`)}>{A.escalate}</button>}
                  </div>
                </div>
                {editingId === u.id && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginTop: 8 }}>
                    <div className="field"><label>{A.name}</label><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                    <div className="field"><label>{A.phone}</label><input className="input" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
                    <div className="field"><label>{A.country}</label><input className="input" maxLength={2} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></div>
                    <div className="field"><label>{A.currency}</label><input className="input" maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} /></div>
                    <div className="field">
                      <label>{A.kyc}</label>
                      <select className="input" value={draft.kyc} onChange={(e) => setDraft({ ...draft, kyc: e.target.value as StaffUser["kycStatus"] })}>
                        <option value="unverified">unverified</option><option value="submitted">submitted</option><option value="verified">verified</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button type="button" className="btn btn-primary" onClick={() => void run(() => updateUser({
                        userId: u.id, name: draft.name, phone: draft.phone,
                        country: draft.country.trim() ? draft.country.trim().toUpperCase() : undefined,
                        defaultCurrency: draft.currency.trim() ? draft.currency.trim().toUpperCase() : undefined, kycStatus: draft.kyc,
                      }), A.saved)}>{A.save}</button>
                    </div>
                  </div>
                )}
                {escalateKey === `u:${u.id}` && <Escalate A={A} userId={u.id} userLabel={label(u)} onDone={() => setEscalateKey(null)} notify={setMessage} />}
              </div>
            ))}
          </div>
        )}

        {tab === "transactions" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="field">
              <label htmlFor="admin-caller">{A.callerLabel}</label>
              <select id="admin-caller" className="input" value={callerId} onChange={(e) => setCallerId(e.target.value)}>
                <option value="">{A.allCallers}</option>
                {(users ?? []).map((u) => <option key={u.id} value={u.id}>{label(u)}{u.email ? ` (${u.email})` : ""}</option>)}
              </select>
            </div>
            {transfers === null && <div className="tag tag-neutral">{A.loading}</div>}
            {transfers && shownTransfers.length === 0 && <div className="text-muted">{A.empty}</div>}
            {shownTransfers.map((t) => (
              <div key={t.id} className="card elev-sm" style={{ gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{t.reference}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{label(t)} · {t.type}{t.note ? ` · ${t.note}` : ""} · {new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{t.amount.toLocaleString()} {t.currency}</div>
                    <span style={STATE_CHIP[t.state] ?? chip("#F1F4F7", "#4A5A6A")}>{t.state.replace("_", " ")}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {canUpdate && COMPLETABLE.includes(t.state) && (
                    <button type="button" className="btn btn-ghost" onClick={() => { const n = window.prompt(A.notePrompt); if (n !== null) void run(() => completeTransfer(t.id, n || undefined), A.complete); }}>{A.complete}</button>
                  )}
                  {canUpdate && t.state === "disputed" && (
                    <button type="button" className="btn btn-ghost" onClick={() => { const n = window.prompt(A.notePrompt); if (n !== null) void run(() => resolveTransfer(t.id, "resolved", n || undefined), A.closeDispute); }}>{A.closeDispute}</button>
                  )}
                  {canUpdate && REFUNDABLE.includes(t.state) && (
                    <button type="button" className="btn btn-ghost" onClick={() => { const n = window.prompt(A.reasonPrompt); if (n) void run(() => resolveTransfer(t.id, "refunded", n), A.refund); }}>{A.refund}</button>
                  )}
                  {canDelete && VOIDABLE.includes(t.state) && (
                    <button type="button" className="btn btn-ghost" onClick={() => {
                      const n = window.prompt(A.reasonPrompt); if (!n) return;
                      const p = window.prompt(A.passwordPrompt); if (p === null) return;
                      void run(() => voidTransfer(t.id, n, p), A.voidTx);
                    }}>{A.voidTx}</button>
                  )}
                  {canCreate && (
                    <button type="button" className="btn btn-ghost" onClick={() => {
                      const a = Number(window.prompt(`${A.amountPrompt} (${t.currency})`)); if (!Number.isFinite(a) || a <= 0) return;
                      const r = window.prompt(A.reasonPrompt); if (!r) return;
                      void run(() => createAdjustment(t.userId, a, t.currency, r), A.creditUser);
                    }}>{A.creditUser}</button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => setEscalateKey(escalateKey === `t:${t.id}` ? null : `t:${t.id}`)}>{A.escalate}</button>
                </div>
                {escalateKey === `t:${t.id}` && <Escalate A={A} userId={t.userId} userLabel={label(t)} transfer={t} onDone={() => setEscalateKey(null)} notify={setMessage} />}
              </div>
            ))}
          </div>
        )}

        {tab === "escalations" && <EscalationsTab A={A} perms={perms} notify={setMessage} />}

        {tab === "access" && perms?.isAdmin && <AccessTab A={A} users={users ?? []} notify={setMessage} reload={reload} />}
        {tab === "audit" && perms?.isAdmin && <AuditTab A={A} />}

        {tab === "staff" && (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {!isSuper && <div className="tag tag-neutral">{A.readOnlyNote}</div>}
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{A.matrixTitle}</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={{ padding: 6 }}>{A.roleLabel}</th><th style={{ padding: 6 }}></th>
                      {ACTIONS.map((a) => <th key={a} style={{ padding: 6, textAlign: "center" }}>{a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.flatMap((role) => RESOURCES.map((resource) => {
                      const cell = matrix.find((m) => m.roleSlug === role.slug && m.resource === resource);
                      const bypass = role.slug === "superadmin";
                      return (
                        <tr key={`${role.slug}:${resource}`} style={{ borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" }}>
                          <td style={{ padding: 6, fontWeight: 600 }} title={role.description}>{resource === "transactions" ? role.label : ""}</td>
                          <td style={{ padding: 6 }} className="text-muted">{resource}</td>
                          {ACTIONS.map((action) => {
                            const locked = LOCKED_CELLS.has(`${resource}:${action}`) || action === "delete";
                            const checked = bypass ? !LOCKED_CELLS.has(`${resource}:${action}`) : Boolean(cell?.[action]);
                            return (
                              <td key={action} style={{ padding: 6, textAlign: "center" }}>
                                <input
                                  type="checkbox" aria-label={`${role.label} ${resource} ${action}`} checked={checked} disabled={!isSuper || bypass || locked}
                                  onChange={() => {
                                    const next: MatrixRow = { roleSlug: role.slug, resource, create: cell?.create ?? false, read: cell?.read ?? false, update: cell?.update ?? false, delete: false };
                                    next[action] = !next[action];
                                    const p = window.prompt(A.passwordPrompt); if (p === null) return;
                                    void run(() => setPermission(next, p), A.saved);
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>{A.deleteNote}</div>
            </div>

            {isSuper && <GatePassword A={A} notify={setMessage} />}
            {isSuper && (
              <div className="card elev-sm" style={{ gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select className="input" style={{ flex: 1, minWidth: 200 }} aria-label={A.selectUser} value={assignUser} onChange={(e) => setAssignUser(e.target.value)}>
                    <option value="">{A.selectUser}</option>
                    {(users ?? []).map((u) => <option key={u.id} value={u.id}>{label(u)}{u.email ? ` (${u.email})` : ""}</option>)}
                  </select>
                  <select className="input" aria-label={A.roleLabel} value={assignRole} onChange={(e) => setAssignRole(e.target.value)}>
                    {roles.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                  </select>
                  <button type="button" className="btn btn-primary" disabled={!assignUser} onClick={() => { const p = window.prompt(A.passwordPrompt); if (p !== null) void run(() => assignStaffRole(assignUser, assignRole, p), A.assign); }}>{A.assign}</button>
                </div>
              </div>
            )}

            <div className="card elev-sm" style={{ gap: 6 }}>
              <div className="card-title">{A.tabStaff} ({staffRows.length})</div>
              {staffRows.length === 0 && <div className="text-muted">{A.empty}</div>}
              {staffRows.map(({ user, role }) => (
                <div key={`${user.id}:${role}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span><strong>{label(user)}</strong> <span className="text-muted">· {roles.find((r) => r.slug === role)?.label ?? role}</span></span>
                  {isSuper && <button type="button" className="btn btn-ghost" onClick={() => { const p = window.prompt(A.passwordPrompt); if (p !== null) void run(() => revokeStaffRole(user.id, role, p), A.revoke); }}>{A.revoke}</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

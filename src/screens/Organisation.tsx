import { useCallback, useEffect, useState } from "react";
import type { Desk, Locale, OrgPageCopy } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { getMyPermissions } from "../lib/adminStaff.ts";
import * as org from "../lib/org.ts";

const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const PRIORITY_CHIP: Record<string, ReturnType<typeof chip>> = {
  critical: chip("#A3243B", "#fff"), high: chip("#FBE0E4", "#A3243B"), normal: chip("#FFF1D6", "#8A5A00"), low: chip("#F1F4F7", "#4A5A6A"),
};
const STATUS_CHIP: Record<string, ReturnType<typeof chip>> = {
  open: chip("#FFF1D6", "#8A5A00"), in_progress: chip("#E7EEF7", "#1D3F6B"), awaiting_approval: chip("#EDE7F7", "#4B2F87"),
  escalated: chip("#FBE0E4", "#A3243B"), resolved: chip("#DDF3E8", "#1B6B45"), closed: chip("#F1F4F7", "#4A5A6A"),
};
const CHILD_KINDS: Record<string, string[]> = {
  group: ["country_entity"], country_entity: ["corporate", "branch", "agent"], corporate: ["site", "branch", "agent"],
  site: ["site", "branch", "agent"], branch: ["branch", "agent"], agent: [],
};
const RESOURCES = ["orgs", "profiles", "users", "transactions", "cases", "kyc_sensitive", "reports"];
const MIN_REASON = 5;
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : "Error");
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;
type Tab = "cases" | "transactions" | "customers" | "units" | "access" | "governance";
type Caps = Record<string, org.OrgCapability>;

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let live = true;
    run().then((d) => { if (live) { setData(d); setError(null); } }).catch((e) => { if (live) setError(errText(e)); });
    return () => { live = false; };
  }, [run, n]);
  return { data, error, reload: () => setN((x) => x + 1) };
}

function AiBox({ O, caseId, canUse, onUseReply, notify }: { O: OrgPageCopy; caseId: string; canUse: boolean; onUseReply: (t: string) => void; notify: (m: string) => void }) {
  const { data, reload } = useLoad(() => org.listCaseAi(caseId), [caseId]);
  const [busy, setBusy] = useState(false);
  const s = data?.[0];
  const p = s?.payload;
  const act = { complete: O.actComplete, refund: O.actRefund, close_dispute: O.actCloseDispute } as Record<string, string>;
  return (
    <div style={{ display: "grid", gap: 6, padding: 12, borderRadius: 10, background: "var(--color-neutral-100, #F1F4F7)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>{s?.source === "ai" ? "✦ " : ""}{s?.source === "rules" ? O.aiRules : O.aiTitle}{s && <span className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}> · {new Date(s.createdAt).toLocaleString()} · {s.status}</span>}</strong>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => {
          setBusy(true);
          org.runCaseTriage(caseId).then((r) => { notify(r.via === "ai" ? O.aiReady : O.aiFallback); reload(); }).catch((e) => notify(errText(e))).finally(() => setBusy(false));
        }}>{busy ? O.aiAnalysing : s ? O.aiReanalyse : O.aiAnalyse}</button>
      </div>
      {!s && <div className="text-muted" style={{ fontSize: 12 }}>{O.aiEmpty}</div>}
      {p && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.priority && <span style={PRIORITY_CHIP[p.priority]}>{p.priority.toUpperCase()}</span>}
            {p.route && <span style={chip("#F1F4F7", "#4A5A6A")}>{p.route.replace(/_/g, " ")}</span>}
            {p.suggested_action && <span style={chip("#E7EEF7", "#1D3F6B")}>{O.aiSuggests}: {act[p.suggested_action]}{p.needs_second_approver ? ` · ${O.aiSecond}` : ""}</span>}
            {p.risk_flags.map((f) => <span key={f} style={chip("#FFF1D6", "#8A5A00")}>{f.replace(/_/g, " ")}</span>)}
          </div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.summary}</div>
          {p.rationale && <div className="text-muted" style={{ fontSize: 12 }}>{p.rationale}</div>}
          <div style={{ fontSize: 12 }}><strong>{O.aiNext}:</strong> {p.next_step}</div>
          {p.draft_reply && <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, background: "var(--color-bg, #fff)", border: "1px solid var(--color-neutral-200, #E3E8EE)" }}><div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase" }}>{O.aiDraft}</div>{p.draft_reply}</div>}
          {canUse && s && s.status === "new" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.draft_reply && <button type="button" className="btn btn-ghost" onClick={() => onUseReply(p.draft_reply ?? "")}>{O.aiUse}</button>}
              <button type="button" className="btn btn-ghost" onClick={() => void org.markCaseAi(s.id, "accepted").then(reload)}>{O.aiUsed}</button>
              <button type="button" className="btn btn-ghost" onClick={() => void org.markCaseAi(s.id, "dismissed").then(reload)}>{O.aiDismiss}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CaseDetail({ O, id, canUpdate, canApprove, onClose, onChanged, notify }: { O: OrgPageCopy; id: string; canUpdate: boolean; canApprove: boolean; onClose: () => void; onChanged: () => void; notify: (m: string) => void }) {
  const { data: c, error, reload } = useLoad(() => org.getCase(id), [id]);
  const [text, setText] = useState("");
  const [action, setAction] = useState("refund");
  const [busy, setBusy] = useState(false);
  const act = { complete: O.actComplete, refund: O.actRefund, close_dispute: O.actCloseDispute } as Record<string, string>;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); notify(ok); setText(""); reload(); onChanged(); } catch (e) { notify(errText(e)); } finally { setBusy(false); }
  };
  if (error) return <div className="tag tag-neutral">{error}</div>;
  if (!c) return <div className="tag tag-neutral">{O.loading}</div>;
  const ok = text.trim().length >= MIN_REASON;
  const pending = c.approvals.find((a) => a.status === "pending");
  const finished = c.status === "resolved" || c.status === "closed";
  return (
    <div className="card elev-sm" style={{ gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="card-title">{c.subject}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{c.reference} · {c.kind} · {O.ownedBy} {c.orgName} · {O.raisedBy} {c.raisedOrgName}</div>
          <div style={{ fontSize: 12, color: c.slaBreached ? "#A3243B" : undefined, fontWeight: c.slaBreached ? 700 : 400 }}>{O.slaDue} {new Date(c.slaDueAt).toLocaleString()}{c.slaBreached ? ` — ${O.slaBreached}` : ""}{c.escalationLevel > 0 ? ` · ${O.escalatedN.replace("{n}", String(c.escalationLevel))}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <span style={PRIORITY_CHIP[c.priority]}>{c.priority.toUpperCase()}</span><span style={STATUS_CHIP[c.status]}>{c.status.replace(/_/g, " ")}</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{O.close}</button>
        </div>
      </div>
      {c.description && <div style={{ fontSize: 13 }}>{c.description}</div>}
      {c.customer && <div className="text-muted" style={{ fontSize: 12 }}>{c.customer.masked_name} · {c.customer.home_country ?? "—"} · KYC {c.customer.kyc_status}</div>}
      {c.transaction && <div className="text-muted" style={{ fontSize: 12 }}>{c.transaction.reference} · {c.transaction.amount} {c.transaction.currency} · {c.transaction.state.replace(/_/g, " ")} · {O.initiatedIn} {c.transaction.origin_country ?? "—"}</div>}

      <AiBox O={O} caseId={id} canUse={canUpdate && !finished} onUseReply={setText} notify={notify} />

      {c.approvals.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 12 }}>{O.approvalsTitle}</strong>
          {c.approvals.map((a) => (
            <div key={a.id} style={{ ...hr, paddingTop: 6, fontSize: 12, display: "grid", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{act[a.action]}</strong><span className="text-muted">{a.status}</span></div>
              <div className="text-muted">{O.requestedLabel}: {a.request_reason}</div>
              {a.decision_reason && <div className="text-muted">{O.decisionLabel}: {a.decision_reason}</div>}
              {a.status === "pending" && canApprove && (a.requested_by_me
                ? <div style={{ color: "#8A5A00" }}>{O.differentPerson}</div>
                : <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-primary" disabled={busy || !ok} onClick={() => void run(() => org.decideCaseAction(a.id, true, text.trim()), O.saved)}>{O.approve}</button>
                    <button type="button" className="btn btn-ghost" disabled={busy || !ok} onClick={() => void run(() => org.decideCaseAction(a.id, false, text.trim()), O.saved)}>{O.reject}</button>
                  </div>)}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 3, maxHeight: 180, overflowY: "auto" }}>
        <strong style={{ fontSize: 12 }}>{O.timeline}</strong>
        {c.events.map((e, i) => <div key={i} style={{ fontSize: 12 }}><span className="text-muted">{new Date(e.at).toLocaleString()}</span> <strong>{e.event.replace(/_/g, " ")}</strong>{e.body ? ` — ${e.body}` : ""}</div>)}
      </div>

      {!finished && (
        <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 8 }}>
          <textarea className="input" rows={2} placeholder={O.reasonPh} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn btn-ghost" disabled={busy || !ok} onClick={() => void run(() => org.commentCase(id, text.trim()), O.saved)}>{O.comment}</button>
            {canUpdate && <button type="button" className="btn btn-ghost" disabled={busy || !ok} onClick={() => void run(() => org.escalateCase(id, text.trim()), O.saved)}>{O.escalate}</button>}
            {canUpdate && !pending && <button type="button" className="btn btn-ghost" disabled={busy || !ok} onClick={() => void run(() => org.closeCase(id, "resolved", text.trim()), O.saved)}>{O.resolveBtn}</button>}
            {canUpdate && !pending && <button type="button" className="btn btn-ghost" disabled={busy || !ok} onClick={() => void run(() => org.closeCase(id, "closed", text.trim()), O.saved)}>{O.closeBtn}</button>}
            {c.transaction && !pending && canApprove && (
              <>
                <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>{Object.entries(act).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <button type="button" className="btn btn-primary" disabled={busy || !ok} onClick={() => void run(() => org.requestCaseAction(id, action, text.trim()), O.saved)}>{O.requestApproval}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CasesTab({ O, o, caps, seed, clearSeed, notify }: { O: OrgPageCopy; o: org.Org; caps: Caps; seed: org.OrgTransfer | null; clearSeed: () => void; notify: (m: string) => void }) {
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: "complaint", subject: "", description: "", priority: "normal" });
  const [busy, setBusy] = useState(false);
  const { data, error, reload } = useLoad(() => org.listCases(o.id, status || undefined), [o.id, status]);
  const kind = seed ? "transaction" : form.kind;
  if (error) return <div className="tag tag-neutral">{error}</div>;
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {caps.cases?.canCreate && (
        <div className="card elev-sm" style={{ gap: 8 }}>
          <div className="card-title">{O.openCase}{seed ? ` — ${seed.reference}` : ""}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input" aria-label={O.kind} disabled={!!seed} value={kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {["complaint", "account", "other"].map((k) => <option key={k} value={k}>{k}</option>)}{seed && <option value="transaction">transaction</option>}
            </select>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder={O.subject} aria-label={O.subject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <select className="input" aria-label={O.priority} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["low", "normal", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}</select>
          </div>
          <textarea className="input" rows={2} placeholder={O.describe} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" disabled={busy || form.subject.trim().length < 3} onClick={() => {
              setBusy(true);
              org.createCase({ orgId: o.id, kind, subject: form.subject.trim(), description: form.description.trim() || undefined, priority: form.priority, transferId: seed?.transferId })
                .then(() => { notify(O.saved); setForm({ ...form, subject: "", description: "" }); clearSeed(); reload(); }).catch((e) => notify(errText(e))).finally(() => setBusy(false));
            }}>{O.openCase}</button>
            {seed && <button type="button" className="btn btn-ghost" onClick={clearSeed}>{O.close}</button>}
            <span className="text-muted" style={{ fontSize: 12 }}>{O.routingNote}</span>
          </div>
        </div>
      )}
      <select className="input" style={{ maxWidth: 220 }} aria-label={O.statusLabel} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">{O.all}</option>{org.CASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>
      {sel && <CaseDetail O={O} id={sel} canUpdate={!!caps.cases?.canUpdate} canApprove={!!caps.transactions?.canUpdate} onClose={() => setSel(null)} onChanged={reload} notify={notify} />}
      {data === null && <div className="tag tag-neutral">{O.loading}</div>}
      {data?.length === 0 && <div className="text-muted">{O.none}</div>}
      {(data ?? []).map((c) => (
        <button key={c.id} type="button" className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 4 }} onClick={() => setSel(c.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{c.subject}</strong>
            <span style={{ display: "flex", gap: 6 }}>{c.slaBreached && <span style={chip("#FBE0E4", "#A3243B")}>{O.slaBreached}</span>}<span style={PRIORITY_CHIP[c.priority]}>{c.priority.toUpperCase()}</span><span style={STATUS_CHIP[c.status]}>{c.status.replace(/_/g, " ")}</span></span>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>{c.reference} · {c.kind} · {c.orgName}{c.customerMaskedName ? ` · ${c.customerMaskedName}` : ""}</div>
        </button>
      ))}
    </div>
  );
}

function TransactionsTab({ O, o, canCase, onOpenCase }: { O: OrgPageCopy; o: org.Org; canCase: boolean; onOpenCase: (t: org.OrgTransfer) => void }) {
  const { data, error } = useLoad(() => org.orgTransfers(o.id), [o.id]);
  if (error) return <div className="tag tag-neutral">{error}</div>;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div className="text-muted" style={{ fontSize: 12 }}>{O.txIntro}</div>
      {data === null && <div className="tag tag-neutral">{O.loading}</div>}
      {data?.length === 0 && <div className="text-muted">{O.none}</div>}
      {(data ?? []).map((t) => (
        <div key={t.transferId} className="card elev-sm" style={{ gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontFamily: "monospace" }}>{t.reference}</strong>
            <span>{t.amount.toLocaleString()} {t.currency} · <span className="text-muted">{t.state.replace(/_/g, " ")}</span></span>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>{t.customerMaskedName} · {O.home} {t.homeCountry ?? "—"} · {O.initiatedIn} {t.originCountry ?? "—"}{t.originOrgName ? ` (${t.originOrgName})` : ""}</div>
          {canCase && <div><button type="button" className="btn btn-ghost" onClick={() => onOpenCase(t)}>{O.openCaseFor}</button></div>}
        </div>
      ))}
    </div>
  );
}

function CustomerDetail({ O, id, onClose, notify }: { O: OrgPageCopy; id: string; onClose: () => void; notify: (m: string) => void }) {
  const { data: d, error, reload } = useLoad(() => org.orgCustomerDetail(id), [id]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="card elev-sm" style={{ gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{O.tabCustomers}</strong><button type="button" className="btn btn-ghost" onClick={onClose}>{O.close}</button></div>
      {error && <div className="tag tag-neutral">{error}</div>}
      {d && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px", fontSize: 13 }}>
            <span className="text-muted">{O.nameLabel}</span><span>{d.name}</span>
            <span className="text-muted">Email</span><span>{d.email ?? "—"}</span>
            <span className="text-muted">{O.phoneLabel}</span><span>{d.phone ?? "—"}</span>
            <span className="text-muted">{O.home}</span><span>{d.homeCountry ?? "—"}</span>
            <span className="text-muted">KYC</span><span>{d.kycStatus}</span>
            {!d.masked && (<><span className="text-muted">{O.dobLabel}</span><span>{d.dateOfBirth ?? "—"}</span><span className="text-muted">{O.addressLabel}</span><span>{d.address ?? "—"}</span><span className="text-muted">ID</span><span>{d.idType ?? "—"}</span></>)}
          </div>
          {d.masked ? (
            <div style={{ display: "grid", gap: 6, padding: 12, borderRadius: 10, background: "var(--color-neutral-100, #F1F4F7)" }}>
              <strong style={{ fontSize: 12 }}>🔒 {O.sensitiveTitle.replace("{c}", d.homeCountry ?? "—")}</strong>
              <div className="text-muted" style={{ fontSize: 12 }}>{O.sensitiveNote}</div>
              <textarea className="input" rows={2} placeholder={O.breakGlassPh} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div><button type="button" className="btn btn-primary" disabled={busy || reason.trim().length < 20} onClick={() => {
                setBusy(true);
                org.requestBreakGlass(id, reason.trim()).then(() => { notify(O.breakGlassDone); setReason(""); reload(); }).catch((e) => notify(errText(e))).finally(() => setBusy(false));
              }}>{O.breakGlassBtn}</button></div>
            </div>
          ) : <div className="text-muted" style={{ fontSize: 12 }}>{O.fullAccess}</div>}
        </>
      )}
    </div>
  );
}

function CustomersTab({ O, o, notify }: { O: OrgPageCopy; o: org.Org; notify: (m: string) => void }) {
  const { data, error } = useLoad(() => org.orgCustomers(o.id), [o.id]);
  const [sel, setSel] = useState<string | null>(null);
  if (error) return <div className="tag tag-neutral">{error}</div>;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      {sel && <CustomerDetail O={O} id={sel} onClose={() => setSel(null)} notify={notify} />}
      {data === null && <div className="tag tag-neutral">{O.loading}</div>}
      {data?.length === 0 && <div className="text-muted">{O.none}</div>}
      {(data ?? []).map((c) => (
        <button key={c.id} type="button" className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 2 }} onClick={() => setSel(c.id)}>
          <strong>{c.maskedName} <span className="text-muted" style={{ fontWeight: 400 }}>{c.maskedEmail}</span></strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{c.homeCountry ?? "—"} · KYC {c.kycStatus}{c.sensitiveVisible ? ` · ${O.fullAccessShort}` : ""}</span>
        </button>
      ))}
    </div>
  );
}

function UnitsTab({ O, o, orgs, caps, isSuper, notify, reloadOrgs }: { O: OrgPageCopy; o: org.Org; orgs: org.Org[]; caps: Caps; isSuper: boolean; notify: (m: string) => void; reloadOrgs: () => void }) {
  const members = useLoad(() => (caps.profiles?.canRead ? org.orgMembers(o.id) : Promise.resolve([])), [o.id, caps.profiles?.canRead]);
  const tpl = useLoad(() => org.orgTemplates(), []);
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [subName, setSubName] = useState("");
  const [subKind, setSubKind] = useState("");
  const [subCountry, setSubCountry] = useState("");
  const usable = (tpl.data?.templates ?? []).filter((t) => t.appliesTo.includes(o.kind) && (isSuper || !t.groupOnly));
  const kinds = CHILD_KINDS[o.kind] ?? [];
  const kind = subKind || kinds[0] || "";
  const children = orgs.filter((x) => x.parentId === o.id);
  const run = (fn: () => Promise<unknown>) => { fn().then(() => { notify(O.saved); members.reload(); reloadOrgs(); }).catch((e) => notify(errText(e))); };
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="card elev-sm" style={{ gap: 6 }}>
        <div className="card-title">{O.membersTitle} — {o.name}</div>
        {!caps.profiles?.canRead && <div className="text-muted">{O.none}</div>}
        {(members.data ?? []).map((m) => (
          <div key={m.memberId} style={{ ...hr, paddingTop: 6, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span><strong>{m.userName ?? m.userEmail}</strong> <span className="text-muted">· {m.userEmail} · {m.templateLabel}</span></span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={m.status === "active" ? chip("#DDF3E8", "#1B6B45") : chip("#F1F4F7", "#4A5A6A")}>{m.status}</span>
              {caps.profiles?.canUpdate && <button type="button" className="btn btn-ghost" onClick={() => run(() => org.setMemberStatus(m.memberId, m.status === "active" ? "suspended" : "active"))}>{m.status === "active" ? O.suspend : O.reactivate}</button>}
            </span>
          </div>
        ))}
        {caps.profiles?.canCreate && (
          <div style={{ ...hr, paddingTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder={O.emailPh} aria-label={O.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="input" aria-label={O.templateLabel} value={slug || usable[0]?.slug || ""} onChange={(e) => setSlug(e.target.value)}>{usable.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}</select>
            <button type="button" className="btn btn-primary" disabled={!email.trim() || !(slug || usable[0])} onClick={() => run(async () => { await org.grantMemberByEmail({ email, orgId: o.id, templateSlug: slug || usable[0].slug }); setEmail(""); })}>{O.add}</button>
            <div className="text-muted" style={{ fontSize: 12, flexBasis: "100%" }}>{O.grantNote}</div>
          </div>
        )}
      </div>
      <div className="card elev-sm" style={{ gap: 6 }}>
        <div className="card-title">{O.unitsTitle} — {o.name}</div>
        {children.length === 0 && <div className="text-muted">{O.none}</div>}
        {children.map((c) => (
          <div key={c.id} style={{ ...hr, paddingTop: 6, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span><strong>{c.name}</strong> <span className="text-muted">· {c.kind.replace("_", " ")}{c.country ? ` · ${c.country}` : ""} · {c.operatingLevel} · {c.memberCount}</span></span>
            {(caps.orgs?.canUpdate || isSuper) && <button type="button" className="btn btn-ghost" onClick={() => run(() => org.setOrgStatus(c.id, c.status === "active" ? "suspended" : "active"))}>{c.status === "active" ? O.suspend : O.reactivate}</button>}
          </div>
        ))}
        {caps.orgs?.canCreate && kinds.length > 0 && (
          <div style={{ ...hr, paddingTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder={O.unitNamePh} aria-label={O.unitNamePh} value={subName} onChange={(e) => setSubName(e.target.value)} />
            <select className="input" aria-label={O.kind} value={kind} onChange={(e) => setSubKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
            <input className="input" style={{ width: 90 }} placeholder={O.countryPh} maxLength={2} value={subCountry} onChange={(e) => setSubCountry(e.target.value.toUpperCase())} />
            <button type="button" className="btn btn-primary" disabled={subName.trim().length < 2} onClick={() => run(async () => { await org.createOrg({ parentId: o.id, kind, name: subName.trim(), country: subCountry || undefined }); setSubName(""); })}>{O.create}</button>
            <div className="text-muted" style={{ fontSize: 12, flexBasis: "100%" }}>{O.inheritNote}</div>
          </div>
        )}
        {isSuper && (
          <div style={{ ...hr, paddingTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="text-muted">{O.levelLabel}:</span>
            <select className="input" aria-label={O.levelLabel} value={o.operatingLevel} onChange={(e) => run(() => org.setOrgLevel(o.id, e.target.value))}>{(tpl.data?.levels ?? []).map((l) => <option key={l.slug} value={l.slug}>{l.label} ({O.depth} {l.maxDepth})</option>)}</select>
          </div>
        )}
      </div>
    </div>
  );
}

function AccessTab({ O }: { O: OrgPageCopy }) {
  const { data, error } = useLoad(() => org.breakGlassLog(), []);
  if (error) return <div className="tag tag-neutral">{error}</div>;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div className="text-muted" style={{ fontSize: 12 }}>{O.accessIntro}</div>
      {data?.length === 0 && <div className="text-muted">{O.none}</div>}
      {(data ?? []).map((g) => (
        <div key={g.id} className="card elev-sm" style={{ gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{g.requesterName} → {g.targetMaskedName} ({g.homeCountry})</strong><span style={g.active ? chip("#FFF1D6", "#8A5A00") : chip("#F1F4F7", "#4A5A6A")}>{g.active ? O.windowOpen : O.windowClosed}</span></div>
          <div className="text-muted" style={{ fontSize: 12 }}>{new Date(g.createdAt).toLocaleString()} — {g.reason}</div>
        </div>
      ))}
    </div>
  );
}

function GovernanceTab({ O, notify }: { O: OrgPageCopy; notify: (m: string) => void }) {
  const { data, error, reload } = useLoad(() => org.orgTemplates(), []);
  if (error) return <div className="tag tag-neutral">{error}</div>;
  if (!data) return <div className="tag tag-neutral">{O.loading}</div>;
  const cell = (slug: string, r: string) => data.perms.find((p) => p.templateSlug === slug && p.resource === r);
  const toggle = (slug: string, r: string, key: "create" | "read" | "update") => {
    const c = cell(slug, r);
    const next = { create: !!c?.canCreate, read: !!c?.canRead, update: !!c?.canUpdate };
    next[key] = !next[key];
    org.setTemplatePermission({ slug, resource: r, ...next }).then(reload).catch((e) => notify(errText(e)));
  };
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="card elev-sm" style={{ gap: 8, overflowX: "auto" }}>
        <div className="text-muted" style={{ fontSize: 12 }}>{O.govIntro}</div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 4 }}>{O.templateLabel}</th>{RESOURCES.map((r) => <th key={r} style={{ padding: 4 }}>{r}</th>)}</tr></thead>
          <tbody>
            {data.templates.map((t) => (
              <tr key={t.slug} style={hr}>
                <td style={{ padding: 4, fontWeight: 600, whiteSpace: "nowrap" }} title={t.description}>{t.label}</td>
                {RESOURCES.map((r) => (
                  <td key={r} style={{ padding: 4, whiteSpace: "nowrap" }}>
                    {(["create", "read", "update"] as const).map((k) => {
                      const c = cell(t.slug, r);
                      const on = k === "create" ? c?.canCreate : k === "read" ? c?.canRead : c?.canUpdate;
                      return <label key={k} title={`${k} ${r}`} style={{ marginRight: 4 }}><input type="checkbox" aria-label={`${t.label} ${r} ${k}`} checked={!!on} onChange={() => toggle(t.slug, r, k)} />{k[0].toUpperCase()}</label>;
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card elev-sm" style={{ gap: 6 }}>
        <div className="card-title">{O.levelsTitle}</div>
        {data.levels.map((l) => (
          <div key={l.slug} style={{ ...hr, paddingTop: 6, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span><strong>{l.label}</strong> <span className="text-muted">· {l.description}</span></span>
            <label style={{ fontSize: 12 }}>{O.depth} <input className="input" type="number" min={0} max={8} defaultValue={l.maxDepth} style={{ width: 64 }} onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== l.maxDepth) org.setLevelRules({ level: l.slug, maxDepth: v, canCreateSuborgs: v > 0, canManageProfiles: l.canManageProfiles }).then(() => { notify(O.saved); reload(); }).catch((er) => notify(errText(er)));
            }} /></label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Organisation({ D, locale, setLocale, onBack, onLogoClick }: { D: Desk; locale: Locale; setLocale: (l: Locale) => void; onBack: () => void; onLogoClick: () => void }) {
  const O = D.orgPage;
  const [isSuper, setIsSuper] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("cases");
  const [seed, setSeed] = useState<org.OrgTransfer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { void getMyPermissions().then((p) => setIsSuper(p.isSuperadmin)).catch(() => setIsSuper(false)); }, []);
  const orgs = useLoad(() => org.listOrgs(), []);
  const list = orgs.data ?? [];
  const minDepth = list.length ? Math.min(...list.map((x) => x.depth)) : 0;
  const current = list.find((x) => x.id === orgId) ?? list.find((x) => x.depth === minDepth) ?? list[0];
  const caps = useLoad(() => (current ? org.orgCapabilities(current.id) : Promise.resolve([] as org.OrgCapability[])), [current?.id]);
  const capMap = Object.fromEntries((caps.data ?? []).map((c) => [c.resource, c])) as Caps;

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "cases", label: O.tabCases, show: !!capMap.cases?.canRead },
    { id: "transactions", label: O.tabTransactions, show: !!capMap.transactions?.canRead },
    { id: "customers", label: O.tabCustomers, show: !!capMap.users?.canRead },
    { id: "units", label: O.tabUnits, show: !!capMap.profiles?.canRead || !!capMap.orgs?.canRead },
    { id: "access", label: O.tabAccess, show: !!capMap.kyc_sensitive?.canRead || isSuper },
    { id: "governance", label: O.tabGovernance, show: isSuper },
  ];
  const visible = tabs.filter((t) => t.show);
  const active = visible.find((t) => t.id === tab) ?? visible[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={D.back} onClick={onBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 980, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{O.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{O.subtitle}</p>
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}
        {orgs.error && <div className="tag tag-neutral">{orgs.error}</div>}
        {orgs.data === null && !orgs.error && <div className="tag tag-neutral">{O.loading}</div>}
        {orgs.data && !current && <div className="text-muted">{O.noOrg}</div>}
        {current && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12 }}>{O.orgLabel}{" "}
                <select className="input" value={current.id} onChange={(e) => setOrgId(e.target.value)}>
                  {list.map((x) => <option key={x.id} value={x.id}>{"— ".repeat(Math.max(0, x.depth - minDepth))}{x.name}{x.status === "suspended" ? " ⏸" : ""}</option>)}
                </select>
              </label>
              <span className="text-muted" style={{ fontSize: 12 }}>{current.kind.replace("_", " ")}{current.country ? ` · ${current.country}` : ""} · {O.levelLabel}: <strong>{current.operatingLevel}</strong></span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {visible.map((t) => <button key={t.id} type="button" className={active?.id === t.id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            {!active && <div className="text-muted">{O.none}</div>}
            {active?.id === "cases" && <CasesTab O={O} o={current} caps={capMap} seed={seed} clearSeed={() => setSeed(null)} notify={setMessage} />}
            {active?.id === "transactions" && <TransactionsTab O={O} o={current} canCase={!!capMap.cases?.canCreate} onOpenCase={(t) => { setSeed(t); setTab("cases"); }} />}
            {active?.id === "customers" && <CustomersTab O={O} o={current} notify={setMessage} />}
            {active?.id === "units" && <UnitsTab O={O} o={current} orgs={list} caps={capMap} isSuper={isSuper} notify={setMessage} reloadOrgs={orgs.reload} />}
            {active?.id === "access" && <AccessTab O={O} />}
            {active?.id === "governance" && <GovernanceTab O={O} notify={setMessage} />}
          </div>
        )}
      </div>
    </div>
  );
}

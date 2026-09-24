import { useCallback, useEffect, useState } from "react";
import type { AdminPageCopy } from "../types.ts";
import {
  errorText, listAiSuggestions, listEscalations, markAiSuggestion, resolveEscalation, runTriage,
  type AiSuggestion, type MyPermissions, type StaffEscalation,
} from "../lib/adminStaff.ts";

const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const STATUS_CHIP: Record<string, ReturnType<typeof chip>> = {
  open: chip("#FFF1D6", "#8A5A00"), approved: chip("#DDF3E8", "#1B6B45"), done: chip("#DDF3E8", "#1B6B45"), rejected: chip("#FBE0E4", "#A3243B"),
};
const PRIORITY_CHIP: Record<string, ReturnType<typeof chip>> = {
  urgent: chip("#A3243B", "#fff"), high: chip("#FBE0E4", "#A3243B"), medium: chip("#FFF1D6", "#8A5A00"), low: chip("#F1F4F7", "#4A5A6A"),
};
const RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const MIN_REASON = 5;

function SuggestionBox({ A, s, canAnalyze, busy, onAnalyse, onUseReply }: {
  A: AdminPageCopy; s: AiSuggestion | undefined; canAnalyze: boolean; busy: boolean; onAnalyse: () => void; onUseReply?: () => void;
}) {
  const action = { approve: A.aiActApprove, reject: A.aiActReject, request_info: A.aiActInfo };
  return (
    <div style={{ display: "grid", gap: 6, padding: 12, borderRadius: 10, background: "var(--color-neutral-100, #F1F4F7)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>
          {s?.source === "ai" ? "✦ " : ""}{s ? (s.source === "ai" ? A.aiAssistant : A.aiRules) : A.aiAssistant}
          {s && <span className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}> · {s.createdByName ?? "—"} · {new Date(s.createdAt).toLocaleString()}</span>}
        </strong>
        {canAnalyze && <button type="button" className="btn btn-ghost" disabled={busy} onClick={onAnalyse}>{busy ? A.aiAnalysing : s ? A.aiReanalyse : A.aiAnalyse}</button>}
      </div>
      {!s && <div className="text-muted" style={{ fontSize: 12 }}>{A.aiEmpty}</div>}
      {s && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={PRIORITY_CHIP[s.priority]}>{s.priority.toUpperCase()}</span>
            <span style={chip("#F1F4F7", "#4A5A6A")}>{s.category.replace(/_/g, " ")}</span>
            <span style={chip("#E7EEF7", "#1D3F6B")}>{A.aiSuggests}: {action[s.recommendedAction]} · {Math.round(s.confidence * 100)}%</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.summary}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{s.rationale}</div>
          <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, background: "var(--color-bg, #fff)", border: "1px solid var(--color-neutral-200, #E3E8EE)" }}>
            <div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{A.aiDraftReply}</div>
            {s.draftReply}
          </div>
          {onUseReply && <div><button type="button" className="btn btn-ghost" onClick={onUseReply}>{A.aiUseReply}</button></div>}
        </>
      )}
    </div>
  );
}

function Case({ A, e, suggestion, perms, notify, reload }: {
  A: AdminPageCopy; e: StaffEscalation; suggestion: AiSuggestion | undefined; perms: MyPermissions | null; notify: (m: string) => void; reload: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const canResolve = perms?.transactions.update ?? false;
  const canAnalyze = perms?.transactions.read ?? false;
  const open = e.status === "open";
  const reasonOk = reason.trim().length >= MIN_REASON;

  const analyse = async () => {
    setAnalysing(true);
    try {
      const r = await runTriage(e.id);
      notify(r.via === "ai" ? A.aiReady : A.aiFallback.replace("{reason}", r.fallbackReason ?? "AI unavailable"));
      reload();
    } catch (err) {
      notify(errorText(err, A.adminOnly));
    } finally {
      setAnalysing(false);
    }
  };

  const decide = async (decision: "approve" | "reject" | "done") => {
    let password: string | undefined;
    if (decision === "approve" && e.action === "void") {
      const p = window.prompt(A.passwordPrompt);
      if (p === null) return;
      password = p;
    }
    setBusy(true);
    try {
      await resolveEscalation(e.id, decision, reason.trim() || undefined, password);
      if (suggestion && suggestion.status === "suggested" && decision !== "done") {
        void markAiSuggestion(suggestion.id, suggestion.recommendedAction === decision ? "used" : "dismissed").catch(() => undefined);
      }
      notify(decision === "reject" ? A.escRejected : A.saved);
      setReason("");
      reload();
    } catch (err) {
      notify(errorText(err, A.adminOnly));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card elev-sm" style={{ gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="card-title" style={{ textTransform: "capitalize" }}>{e.action.replace("_", " ")}{e.amount != null ? ` · ${e.amount.toLocaleString()} ${e.currency ?? ""}` : ""}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{e.targetName ?? e.targetEmail ?? "—"}{e.transferReference ? ` · ${e.transferReference}` : ""} · {e.requesterName ?? "—"} · {new Date(e.createdAt).toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          {suggestion && <span style={PRIORITY_CHIP[suggestion.priority]}>{suggestion.priority.toUpperCase()}</span>}
          <span style={STATUS_CHIP[e.status] ?? chip("#F1F4F7", "#4A5A6A")}>{e.status}</span>
        </div>
      </div>
      <div>{e.details}</div>

      {e.resolutionNote && (
        <div style={{ padding: "8px 10px", borderRadius: 8, background: e.status === "rejected" ? "#FBE0E4" : "#DDF3E8", fontSize: 12 }}>
          <div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{e.status === "rejected" ? A.escReasonRejection : A.escReasonDecision}</div>
          {e.resolutionNote}
        </div>
      )}

      {(open || e.status === "approved") && (
        <SuggestionBox A={A} s={suggestion} canAnalyze={canAnalyze} busy={analysing} onAnalyse={() => void analyse()}
          onUseReply={canResolve && open && suggestion ? () => setReason(suggestion.draftReply) : undefined} />
      )}

      {canResolve && (open || e.status === "approved") && (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="field">
            <label htmlFor={`reason-${e.id}`}>{open ? A.escReasonLabel : A.escDoneNote}</label>
            <textarea id={`reason-${e.id}`} className="input" rows={2} value={reason} placeholder={open ? A.escReasonPlaceholder : ""} onChange={(ev) => setReason(ev.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {open && (
              <>
                <button type="button" className="btn btn-primary" disabled={busy || !reasonOk} onClick={() => void decide("approve")}>{A.approve}</button>
                <button type="button" className="btn btn-ghost" disabled={busy || !reasonOk} onClick={() => void decide("reject")}>{A.reject}</button>
              </>
            )}
            {e.status === "approved" && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void decide("done")}>{A.markDone}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// Escalated-issue queue: highest priority first (from the latest AI / rules
// analysis), decisions need a written reason the requester can read, and the
// assistant only ever suggests.
export function EscalationsTab({ A, perms, notify }: { A: AdminPageCopy; perms: MyPermissions | null; notify: (m: string) => void }) {
  const [escalations, setEscalations] = useState<StaffEscalation[] | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    void listEscalations().then(setEscalations).catch(() => setEscalations([]));
    void listAiSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }, [tick]);

  const byEsc = new Map(suggestions.map((s) => [s.escalationId, s]));
  const rows = (escalations ?? [])
    .filter((e) => filter === "all" || e.status === "open" || e.status === "approved")
    .sort((a, b) => {
      const open = Number(b.status === "open") - Number(a.status === "open");
      if (open) return open;
      const pr = (RANK[byEsc.get(b.id)?.priority ?? ""] ?? 0) - (RANK[byEsc.get(a.id)?.priority ?? ""] ?? 0);
      return pr || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="esc-filter" className="text-muted" style={{ fontSize: 12 }}>{A.escShow}</label>
        <select id="esc-filter" className="input" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as "open" | "all")}>
          <option value="open">{A.escOpenOnly}</option><option value="all">{A.escAll}</option>
        </select>
        <span className="text-muted" style={{ fontSize: 12 }}>{A.escHighestFirst}</span>
      </div>
      {escalations === null && <div className="tag tag-neutral">{A.loading}</div>}
      {escalations && rows.length === 0 && <div className="text-muted">{A.empty}</div>}
      {rows.map((e) => <Case key={e.id} A={A} e={e} suggestion={byEsc.get(e.id)} perms={perms} notify={notify} reload={reload} />)}
    </div>
  );
}

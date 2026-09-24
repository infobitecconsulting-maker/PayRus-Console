import { useEffect, useState } from "react";
import { requireStepUp } from "../lib/mfa.ts";
import { mfaCopy } from "../components/Mfa.tsx";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import {
  COMMISSION_RATE, loadSendContext, resolveRecipient, searchMyCounterparts, sendP2p,
  type Counterpart, type P2pReceipt, type Recipient, type SendContext,
} from "../lib/p2p.ts";

type Step = "search" | "amount" | "confirm" | "success";
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : fallback);
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;

export function Send({ D, locale, setLocale, userId, onBack, onLogoClick }: { D: Desk; locale: Locale; setLocale: (l: Locale) => void; userId: string | null; onBack: () => void; onLogoClick: () => void }) {
  const S = D.sendPage;
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [contacts, setContacts] = useState<Counterpart[]>([]);
  const [recent, setRecent] = useState<Counterpart[]>([]);
  const [ctx, setCtx] = useState<SendContext | null>(null);
  const [to, setTo] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<P2pReceipt | null>(null);

  useEffect(() => {
    if (!userId) return;
    void loadSendContext(userId).then((c) => { setCtx(c); setCurrency((cur) => cur || c.defaultCurrency || c.wallets[0]?.currency || "USD"); }).catch(() => undefined);
    void searchMyCounterparts("", 5).then(setRecent).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!userId || !debounced) { setContacts([]); return; }
    let live = true;
    void searchMyCounterparts(debounced).then((r) => { if (live) setContacts(r); }).catch(() => { if (live) setContacts([]); });
    return () => { live = false; };
  }, [debounced, userId]);

  const pick = (r: Recipient) => { setTo(r); setShowSuggest(false); setMessage(null); if (r.defaultCurrency && !ctx?.wallets.length) setCurrency(r.defaultCurrency); setStep("amount"); };
  const pickContact = (c: Counterpart) => pick({ id: c.id, name: c.name, username: c.username, defaultCurrency: c.lastCurrency ?? c.defaultCurrency });

  const find = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true); setMessage(null);
    try {
      const found = await resolveRecipient(q);
      if (!found) setMessage(S.notFound.replace("{q}", q));
      else if (found.id === userId) setMessage(S.cannotSelf);
      else pick(found);
    } catch (e) { setMessage(errText(e, S.failed)); } finally { setBusy(false); }
  };

  const onEnter = () => {
    const first = contacts[0];
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (first && q && first.name.toLowerCase().startsWith(q)) pickContact(first); else void find();
  };

  const amt = parseFloat(amount) || 0;
  const fee = amt * COMMISSION_RATE;
  const total = amt + fee;
  const wallet = ctx?.wallets.find((w) => w.currency === currency);
  const currencies = Array.from(new Set([...(ctx?.wallets.map((w) => w.currency) ?? []), ...(ctx?.defaultCurrency ? [ctx.defaultCurrency] : []), currency].filter(Boolean)));
  const short = !!wallet && total > wallet.balance;

  const confirm = async () => {
    if (!userId || !to) return;
    if (!(await requireStepUp())) { setMessage(mfaCopy(locale).codeInvalid); return; }
    setBusy(true); setMessage(null);
    try {
      setReceipt(await sendP2p({ senderId: userId, recipientId: to.id, amount: amt, currency, note: note.trim() || undefined }));
      setStep("success");
      void searchMyCounterparts("", 5).then(setRecent).catch(() => undefined);
      void loadSendContext(userId).then(setCtx).catch(() => undefined);
    } catch (e) { setMessage(errText(e, S.failed)); } finally { setBusy(false); }
  };

  const reset = () => { setStep("search"); setTo(null); setReceipt(null); setAmount(""); setNote(""); setQuery(""); setMessage(null); };

  const contactRow = (c: Counterpart, sub: string) => (
    <button key={c.id} type="button" role="option" aria-selected={false} className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 2 }}
      onMouseDown={(e) => e.preventDefault()} onClick={() => pickContact(c)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>{c.name}</strong>
        <span className="text-muted" style={{ fontSize: 12 }}>{c.lastCurrency ?? ""}</span>
      </div>
      <span className="text-muted" style={{ fontSize: 12 }}>{sub}</span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={step === "search" || step === "success" ? D.back : S.back} onClick={step === "amount" ? () => setStep("search") : step === "confirm" ? () => setStep("amount") : onBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 640, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{S.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{S.subtitle}</p>
        {!userId && <div className="tag tag-neutral">{S.signIn}</div>}
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}

        {userId && step === "search" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <label className="card-title" htmlFor="send-find">{S.findLabel}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="send-find" className="input" style={{ flex: 1 }} placeholder={S.findPlaceholder} value={query} autoComplete="off"
                  role="combobox" aria-expanded={showSuggest && contacts.length > 0} aria-autocomplete="list"
                  onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }} onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                  onKeyDown={(e) => { if (e.key === "Enter") onEnter(); if (e.key === "Escape") setShowSuggest(false); }} />
                <button type="button" className="btn btn-primary" disabled={busy || !query.trim()} onClick={() => void find()}>{busy ? S.checking : S.find}</button>
              </div>
              {showSuggest && query.trim() && (
                <div role="listbox" style={{ display: "grid", gap: 6 }}>
                  {contacts.map((c) => contactRow(c, `${c.username ? `@${c.username} · ` : ""}${c.maskedEmail ?? ""} · ${S.sentTimes.replace("{n}", String(c.timesSent))}`))}
                  {contacts.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>{S.noContactMatch}</div>}
                </div>
              )}
              <div className="text-muted" style={{ fontSize: 12 }}>{S.findNote}</div>
            </div>
            {!query.trim() && recent.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{S.yourContacts}</strong>
                {recent.map((c) => contactRow(c, `${c.username ? `@${c.username} · ` : ""}${S.lastSent.replace("{d}", new Date(c.lastSentAt).toLocaleDateString())}`))}
              </div>
            )}
          </div>
        )}

        {userId && step === "amount" && to && (
          <div className="card elev-sm" style={{ gap: 10 }}>
            <div><div className="card-title">{to.name}</div><div className="text-muted" style={{ fontSize: 12 }}>{to.username ? `@${to.username}` : ""}</div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label htmlFor="send-amt">{S.amountLabel}</label><input id="send-amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div className="field"><label htmlFor="send-cur">{S.currencyLabel}</label>
                <select id="send-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{currencies.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </div>
            </div>
            <div className="field"><label htmlFor="send-note">{S.noteLabel}</label><input id="send-note" className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={S.notePh} /></div>
            <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 4, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">{S.fee}</span><span>{fmt(fee)} {currency}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{S.total}</strong><strong>{fmt(total)} {currency}</strong></div>
              {wallet && <div className="text-muted" style={{ fontSize: 12 }}>{S.balance}: {fmt(wallet.balance)} {currency}</div>}
              {short && <div style={{ color: "#A3243B", fontSize: 12 }}>{S.insufficient}</div>}
            </div>
            <div><button type="button" className="btn btn-primary" disabled={amt <= 0 || !currency} onClick={() => setStep("confirm")}>{S.review}</button></div>
          </div>
        )}

        {userId && step === "confirm" && to && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            <div className="card-title">{S.confirmTitle}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13 }}>
              <span className="text-muted">{S.to}</span><span>{to.name}</span>
              <span className="text-muted">{S.amountLabel}</span><span>{fmt(amt)} {currency}</span>
              <span className="text-muted">{S.fee}</span><span>{fmt(fee)} {currency}</span>
              <span className="text-muted">{S.total}</span><strong>{fmt(total)} {currency}</strong>
              {note.trim() && (<><span className="text-muted">{S.noteLabel}</span><span>{note.trim()}</span></>)}
            </div>
            <div><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirm()}>{busy ? S.sending : S.confirm}</button></div>
          </div>
        )}

        {step === "success" && receipt && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            <div className="card-title">✓ {S.success}</div>
            <div style={{ fontSize: 13 }}>{S.sentTo.replace("{amount}", `${fmt(receipt.amount)} ${receipt.currency}`).replace("{name}", receipt.recipientName)}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{S.from}: {receipt.senderName} → {S.to}: {receipt.recipientName} · {S.reference}: <span style={{ fontFamily: "monospace" }}>{receipt.reference}</span></div>
            <div><button type="button" className="btn btn-ghost" onClick={reset}>{S.another}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

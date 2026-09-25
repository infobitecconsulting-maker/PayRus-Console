import { useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { requireStepUp } from "../lib/mfa.ts";
import { mfaCopy } from "../components/Mfa.tsx";
import { COUNTRY_OPTIONS, callingCodeForCountry, currencyForCountry } from "../lib/geo.ts";
import {
  COMMISSION_RATE, getCorridorQuote, listMyPayouts, listMyReceivers, loadSendContext, resolveRecipient, sendToNewReceiver,
  type CorridorQuote, type PayoutMethod, type PayoutReceipt, type PayoutRow, type Receiver, type Recipient, type SendContext,
} from "../lib/p2p.ts";

type Step = "form" | "amount" | "confirm" | "success";
const METHODS: PayoutMethod[] = ["mobile_money", "bank", "cash_pickup"];
const MOBILE_PROVIDERS = ["M-Pesa", "Orange Money", "MTN MoMo", "Airtel Money", "Wave", "Moov Money"];
const ID_TYPES = ["passport", "national_id", "driving_licence", "residence_permit"] as const;
const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const STATUS_CHIP: Record<PayoutRow["status"], ReturnType<typeof chip>> = {
  processing: chip("#FFF1D6", "#8A5A00"), ready_for_pickup: chip("#E7EEF7", "#1D3F6B"), paid_out: chip("#DDF3E8", "#1B6B45"),
  blocked: chip("#FBE0E4", "#A3243B"), cancelled: chip("#F1F4F7", "#4A5A6A"),
};
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const errText = (e: unknown, fb: string) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : fb);
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;

export function NewReceiver({ D, locale, setLocale, userId, onBack, onLogoClick, onSendToMember }: {
  D: Desk; locale: Locale; setLocale: (l: Locale) => void; userId: string | null; onBack: () => void; onLogoClick: () => void; onSendToMember: (m: Recipient) => void;
}) {
  const R = D.receiverPage;
  const [step, setStep] = useState<Step>("form");
  const [ctx, setCtx] = useState<SendContext | null>(null);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("mobile_money");
  const [provider, setProvider] = useState("");
  const [account, setAccount] = useState("");
  const [idType, setIdType] = useState<string>(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");
  const [member, setMember] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<CorridorQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PayoutReceipt | null>(null);

  const reloadLists = () => {
    void listMyReceivers().then(setReceivers).catch(() => undefined);
    void listMyPayouts().then(setPayouts).catch(() => undefined);
  };
  useEffect(() => {
    if (!userId) return;
    void loadSendContext(userId).then((c) => { setCtx(c); setFrom((f) => f || c.defaultCurrency || c.wallets[0]?.currency || "USD"); }).catch(() => undefined);
    reloadLists();
    const id = setInterval(() => void listMyPayouts().then(setPayouts).catch(() => undefined), 20000);
    return () => clearInterval(id);
  }, [userId]);

  const toCurrency = country ? currencyForCountry(country) : "";
  const numAmt = parseFloat(amount) || 0;
  const cross = !!toCurrency && toCurrency !== from;
  useEffect(() => {
    if (step === "form" || !cross || numAmt <= 0) { setQuote(null); return; }
    let live = true;
    void getCorridorQuote(from, toCurrency, numAmt).then((q) => { if (live) setQuote(q); }).catch(() => { if (live) setQuote(null); });
    return () => { live = false; };
  }, [step, cross, from, toCurrency, numAmt]);

  useEffect(() => {
    const ids = [phone.trim().length >= 7 ? phone.trim() : "", email.includes("@") ? email.trim() : ""].filter(Boolean);
    if (ids.length === 0) { setMember(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      for (const i of ids) {
        try { const f = await resolveRecipient(i); if (live && f && f.id !== userId) { setMember(f); return; } } catch { /* ignore */ }
      }
      if (live) setMember(null);
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [phone, email, userId]);

  const fee = cross ? (quote?.fee ?? 0) : numAmt * COMMISSION_RATE;
  const receives = cross ? (quote?.receiveAmount ?? 0) : numAmt;
  const total = numAmt + fee;
  const wallet = ctx?.wallets.find((w) => w.currency === from);
  const short = !!wallet && total > wallet.balance;
  const blocked = cross && quote && !quote.ok ? quote.blockedReason : null;
  const currencies = Array.from(new Set([...(ctx?.wallets.map((w) => w.currency) ?? []), ...(ctx?.defaultCurrency ? [ctx.defaultCurrency] : []), from].filter(Boolean)));
  const idLabel = R[`idType_${idType}` as keyof typeof R];

  const formOk = fullName.trim().length >= 2 && !!country && (
    method === "mobile_money" ? !!provider && (account || phone).trim().length >= 7
    : method === "bank" ? !!provider.trim() && account.replace(/\s/g, "").length >= 8
    : phone.trim().length >= 7 && idNumber.trim().length >= 4
  );

  const pick = (r: Receiver) => {
    setFullName(r.fullName); setCountry(r.country ?? ""); setCity(r.city ?? ""); setPhone(r.phone ?? ""); setMethod(r.deliveryMethod);
    setProvider(r.provider ?? ""); setAccount(r.deliveryMethod === "bank" ? r.account : ""); setIdType(r.idType ?? ID_TYPES[0]); setIdNumber(r.idNumber ?? "");
  };

  const confirm = async () => {
    if (!userId) return;
    if (!(await requireStepUp())) { setMessage(mfaCopy(locale).codeInvalid); return; }
    setBusy(true); setMessage(null);
    try {
      const r = await sendToNewReceiver({
        senderId: userId, amount: numAmt, from, note: note.trim() || undefined, fullName: fullName.trim(), country, currency: toCurrency, deliveryMethod: method,
        provider: method === "cash_pickup" ? undefined : provider.trim(), account: method === "bank" ? account.trim() : method === "mobile_money" ? (account || phone).trim() : undefined,
        phone: phone.trim() || undefined, idType: method === "cash_pickup" ? idType : undefined, idNumber: method === "cash_pickup" ? idNumber.trim() : undefined, city: city.trim() || undefined,
      });
      setReceipt(r); setStep("success"); reloadLists();
      void loadSendContext(userId).then(setCtx).catch(() => undefined);
    } catch (e) { setMessage(errText(e, R.failed)); } finally { setBusy(false); }
  };

  const goBack = step === "amount" ? () => setStep("form") : step === "confirm" ? () => setStep("amount") : onBack;
  const field = (id: string, label: string, control: React.ReactNode) => <div className="field"><label htmlFor={id}>{label}</label>{control}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={step === "form" || step === "success" ? D.back : R.back} onClick={goBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 680, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{R.title}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{R.subtitle}</p>
        {!userId && <div className="tag tag-neutral">{D.sendPage.signIn}</div>}
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}

        {userId && step === "form" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {receivers.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{R.saved}</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {receivers.slice(0, 8).map((r) => <button key={r.id} type="button" className="btn btn-ghost" onClick={() => pick(r)}>{r.fullName} · {R[`method_${r.deliveryMethod}` as keyof typeof R]}{r.country ? ` · ${r.country}` : ""}</button>)}
                </div>
              </div>
            )}
            <div className="card elev-sm" style={{ gap: 10 }}>
              {field("nr-name", R.fullName, <input id="nr-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                {field("nr-country", R.country, (
                  <select id="nr-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">—</option>{COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                ))}
                {field("nr-city", R.city, <input id="nr-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />)}
                {field("nr-phone", R.phone, <input id="nr-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={country ? `+${callingCodeForCountry(country)} …` : "+…"} />)}
                {field("nr-email", R.email, <input id="nr-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
              </div>
              {toCurrency && <div className="text-muted" style={{ fontSize: 12 }}>{R.receivesIn.replace("{currency}", toCurrency)}</div>}
              <div className="text-muted" style={{ fontSize: 12 }}>{R.emailHint}</div>
            </div>

            {member && (
              <div className="card elev-sm" role="status" style={{ gap: 6, background: "#E7F3EC" }}>
                <strong>✓ {R.memberFound.replace("{name}", member.name)}</strong>
                <div style={{ fontSize: 13 }}>{R.memberPerks}</div>
                <div><button type="button" className="btn btn-primary" onClick={() => onSendToMember(member)}>{R.sendToWallet}</button></div>
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 13 }}>{R.method}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {METHODS.map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} className={method === m ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setMethod(m)}>
                    {R[`method_${m}` as keyof typeof R]} <span style={{ fontWeight: 400, fontSize: 11 }}>· {R[`eta_${m}` as keyof typeof R]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card elev-sm" style={{ gap: 10 }}>
              {method === "mobile_money" && (
                <>
                  {field("nr-prov", R.provider, <select id="nr-prov" className="input" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="">—</option>{MOBILE_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}</select>)}
                  {field("nr-mm", R.mmNumber, <input id="nr-mm" className="input" inputMode="tel" value={account} onChange={(e) => setAccount(e.target.value)} placeholder={phone || "+…"} />)}
                </>
              )}
              {method === "bank" && (
                <>
                  {field("nr-bank", R.bankName, <input id="nr-bank" className="input" value={provider} onChange={(e) => setProvider(e.target.value)} />)}
                  {field("nr-iban", R.account, <input id="nr-iban" className="input" value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="off" />)}
                </>
              )}
              {method === "cash_pickup" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                    {field("nr-idt", R.idTypeLabel, <select id="nr-idt" className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>{ID_TYPES.map((i) => <option key={i} value={i}>{R[`idType_${i}` as keyof typeof R]}</option>)}</select>)}
                    {field("nr-idn", R.idNumber, <input id="nr-idn" className="input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} autoComplete="off" />)}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{R.idHint}</div>
                </>
              )}
            </div>
            <div><button type="button" className="btn btn-primary" onClick={() => { if (formOk) { setMessage(null); setStep("amount"); } else setMessage(R.requiredFields); }}>{R.continue}</button></div>

            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 13 }}>{R.payouts}</strong>
              {payouts.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>{R.noPayouts}</div>}
              {payouts.slice(0, 5).map((p) => (
                <div key={p.id} className="card elev-sm" style={{ gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{p.receiverName}</strong><span>{fmt(p.receiveAmount)} {p.toCurrency} <span style={STATUS_CHIP[p.status]}>{R[`status_${p.status}` as keyof typeof R]}</span></span>
                  </div>
                  <span className="text-muted" style={{ fontSize: 12 }}>{R[`method_${p.deliveryMethod}` as keyof typeof R]} · {p.accountMasked} · {new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.pickupCode && <span style={{ fontFamily: "monospace", fontSize: 13 }}>{R.pickupCode}: {p.pickupCode}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {userId && step === "amount" && (
          <div className="card elev-sm" style={{ gap: 10 }}>
            <div><div className="card-title">{fullName}</div><div className="text-muted" style={{ fontSize: 12 }}>{R[`method_${method}` as keyof typeof R]}{provider ? ` · ${provider}` : ""} · {country}</div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label htmlFor="nr-amt">{R.youSend}</label><input id="nr-amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div className="field"><label htmlFor="nr-from">{R.payFrom}</label><select id="nr-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{currencies.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            {field("nr-note", R.note, <input id="nr-note" className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />)}
            <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 4, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">{R.fee}</span><span>{fmt(fee)} {from}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">{R.theyGet}</span><strong>{fmt(receives)} {toCurrency || from}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{R.total}</strong><strong>{fmt(total)} {from}</strong></div>
              {wallet && <div className="text-muted" style={{ fontSize: 12 }}>{R.balance}: {fmt(wallet.balance)} {from}</div>}
              {short && <div style={{ color: "#A3243B", fontSize: 12 }}>{R.insufficient}</div>}
              {blocked && <div style={{ color: "#A3243B", fontSize: 12 }}>{R.failed} ({blocked.replace(/_/g, " ")})</div>}
            </div>
            <div><button type="button" className="btn btn-primary" disabled={numAmt <= 0 || short || !!blocked || (cross && !quote)} onClick={() => setStep("confirm")}>{R.review}</button></div>
          </div>
        )}

        {userId && step === "confirm" && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            <div className="card-title">{R.review}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13 }}>
              <span className="text-muted">{R.to}</span><span>{fullName}</span>
              <span className="text-muted">{R.methodLabel}</span><span>{[R[`method_${method}` as keyof typeof R], provider].filter(Boolean).join(" · ")}</span>
              <span className="text-muted">{R.countryLabel}</span><span>{country}</span>
              {method === "cash_pickup" && (<><span className="text-muted">{R.idNumber}</span><span>{idLabel} {idNumber}</span></>)}
              <span className="text-muted">{R.youSend}</span><span>{fmt(numAmt)} {from}</span>
              <span className="text-muted">{R.fee}</span><span>{fmt(fee)} {from}</span>
              <span className="text-muted">{R.theyGet}</span><span>{fmt(receives)} {toCurrency || from}</span>
              <span className="text-muted">{R.total}</span><strong>{fmt(total)} {from}</strong>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>{R.memberNudge}</div>
            <div><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirm()}>{busy ? R.sending : R.confirm}</button></div>
          </div>
        )}

        {step === "success" && receipt && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="card elev-sm" style={{ gap: 6 }}>
              <div className="card-title">✓ {R.success}</div>
              <div style={{ fontSize: 13 }}>{R.sentTo.replace("{amount}", `${fmt(receipt.receiveAmount)} ${receipt.toCurrency}`).replace("{name}", receipt.receiverName)}</div>
              <div><span style={STATUS_CHIP[receipt.payoutStatus]}>{R[`status_${receipt.payoutStatus}` as keyof typeof R]}</span> <span className="text-muted" style={{ fontFamily: "monospace", fontSize: 12 }}>{receipt.reference}</span></div>
            </div>
            {receipt.pickupCode && (
              <div className="card elev-sm" style={{ gap: 6, textAlign: "center" }}>
                <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase" }}>{R.pickupCode}</div>
                <div style={{ fontFamily: "monospace", fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>{receipt.pickupCode}</div>
                <div><button type="button" className="btn btn-ghost" onClick={() => { void navigator.clipboard?.writeText(receipt.pickupCode ?? ""); setMessage(R.copied); }}>{R.copy}</button></div>
                <div className="text-muted" style={{ fontSize: 12 }}>{R.pickupHelp.replace("{name}", receipt.receiverName).replace("{idType}", String(idLabel)).replace("{idNumber}", idNumber)}</div>
              </div>
            )}
            <div><button type="button" className="btn btn-ghost" onClick={onBack}>{R.another}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

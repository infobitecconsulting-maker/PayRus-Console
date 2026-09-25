import { useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { requireStepUp } from "../lib/mfa.ts";
import { mfaCopy } from "../components/Mfa.tsx";
import { geocodeAddress } from "../lib/geocode.ts";
import { COUNTRY_OPTIONS, callingCodeForCountry, currencyForCountry } from "../lib/geo.ts";
import {
  ensureDemoAgentsNear, getChannelOptions, getChannelQuote, findPayoutAgents, listPickupPoints, listOpenCorridors, getPayoutOptions, listMyPayouts, listMyReceivers, loadSendContext, resolveRecipient, sendToNewReceiver,
  type ChannelOption, type ChannelQuote, type PayoutAgent, type PayoutMethod, type PayoutOption, type PayoutReceipt, type PayoutRow, type Receiver, type Recipient, type SendContext,
} from "../lib/p2p.ts";

type Step = "who" | "how" | "amount" | "confirm" | "success";
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
  const [step, setStep] = useState<Step>("who");
  const [ctx, setCtx] = useState<SendContext | null>(null);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<Recipient | null>(null);
  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [provider, setProvider] = useState("");
  const [account, setAccount] = useState("");
  const [idType, setIdType] = useState<string>(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");
  const [agents, setAgents] = useState<PayoutAgent[] | null>(null);
  const [located, setLocated] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [allAgents, setAllAgents] = useState<PayoutAgent[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [note, setNote] = useState("");
  // Cash is priced by the network of the chosen agent: PayRus agent or partner distributor.
  const agentKind = method === "cash_pickup" ? (agents?.find((a) => a.id === agentId) ?? allAgents?.find((a) => a.id === agentId))?.kind : undefined;
  const channelType = agentKind === "payrus_direct" ? "payrus_agent" : agentKind === "correspondent" ? "partner_distributor" : undefined;
  const [cq, setCq] = useState<ChannelQuote | null>(null);
  const [chOptions, setChOptions] = useState<ChannelOption[] | null>(null);
  const [options, setOptions] = useState<PayoutOption[] | null>(null);
  const [openCorridors, setOpenCorridors] = useState<{ from: string; to: string }[] | null>(null);
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
    void listOpenCorridors().then(setOpenCorridors).catch(() => undefined);
    const id = setInterval(() => void listMyPayouts().then(setPayouts).catch(() => undefined), 20000);
    return () => clearInterval(id);
  }, [userId]);

  const toCurrency = country ? currencyForCountry(country) : "";
  const numAmt = parseFloat(amount) || 0;
  // The price follows the selected channel: the rail partner's contract terms, its SLA and the PayRus pricing policy.
  useEffect(() => {
    if ((step !== "amount" && step !== "confirm") || !method || !country || numAmt <= 0) { setCq(null); return; }
    let live = true;
    const t = setTimeout(() => {
      void getChannelQuote({ from, amount: numAmt, country, method, provider: provider || undefined, to: toCurrency, channelType }).then((q) => { if (live) setCq(q); }).catch(() => { if (live) setCq(null); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [step, method, country, provider, from, numAmt, toCurrency, channelType]);
  useEffect(() => {
    if (!country || step === "who" || step === "success") { setChOptions(null); return; }
    let live = true;
    const t = setTimeout(() => {
      void getChannelOptions(country, from, step === "amount" || step === "confirm" ? numAmt || undefined : undefined).then((o) => { if (live) setChOptions(o); }).catch(() => { if (live) setChOptions(null); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [country, from, step, numAmt]);

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

  // Which payout methods / providers are actually connected in the receiver's country.
  useEffect(() => {
    if (!country) { setOptions(null); return; }
    let live = true;
    void getPayoutOptions(country).then((o) => { if (live) setOptions(o); }).catch(() => { if (live) setOptions(null); });
    return () => { live = false; };
  }, [country]);
  const optionFor = (m: PayoutMethod) => options?.find((o) => o.method === m);
  const methodAvailable = (m: PayoutMethod) => !options || (optionFor(m)?.available ?? true);
  useEffect(() => {
    if (method && !methodAvailable(method)) { setMethod(null); setProvider(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);
  const channelHint = (m: PayoutMethod) => {
    const o = chOptions?.find((x) => x.method === m);
    const del = o?.deliveryTime ? R[`delivery_${o.deliveryTime}` as keyof typeof R] : R[`eta_${m}` as keyof typeof R];
    return o?.fee != null ? `≈ ${fmt(o.fee)} ${from} · ${del}` : del;
  };
  const mmProviders = optionFor("mobile_money")?.providers?.length ? optionFor("mobile_money")!.providers : MOBILE_PROVIDERS;
  const bankNames = optionFor("bank")?.providers ?? [];

  // Propose payout agents near the receiver's address once cash pickup is chosen.
  useEffect(() => {
    if (step !== "how" || method !== "cash_pickup") return;
    let live = true;
    setAgents(null); setLocated(false); setAllAgents(null); setCoords(null);
    void (async () => {
      const at = await geocodeAddress(address.trim(), city.trim(), country);
      let list: PayoutAgent[] = [];
      if (at) { try { await ensureDemoAgentsNear({ country, city: city.trim(), address: address.trim(), lat: at.lat, lng: at.lng }); } catch { /* demo helper only */ } }
      try { list = await findPayoutAgents({ country, city: city.trim(), lat: at?.lat, lng: at?.lng }); } catch { /* keep empty */ }
      if (!live) return;
      setCoords(at ? { lat: at.lat, lng: at.lng } : null);
      setLocated(!!at); setAgents(list); setAgentId((cur) => (cur && list.some((a) => a.id === cur) ? cur : list[0]?.id ?? null));
    })();
    return () => { live = false; };
  }, [step, method, country, city, address]);

  const fee = cq?.fee ?? 0;
  const receives = cq?.receiveAmount ?? 0;
  const total = numAmt + fee;
  const wallet = ctx?.wallets.find((w) => w.currency === from);
  const short = !!wallet && total > wallet.balance;
  const blocked = cq && !cq.ok ? cq.blockedReason : null;
  // Only offer wallets that can actually pay this receiver: their own currency, or one with an open corridor to it.
  const canPayFrom = (c: string) => !toCurrency || c === toCurrency || !openCorridors || openCorridors.some((o) => o.from === c && o.to === toCurrency);
  const payFromOptions = (ctx?.wallets.map((w) => w.currency) ?? []).filter(canPayFrom);
  const noRouteAtAll = !!toCurrency && (ctx?.wallets.length ?? 0) > 0 && payFromOptions.length === 0;
  useEffect(() => {
    if (toCurrency && payFromOptions.length > 0 && !payFromOptions.includes(from)) setFrom(payFromOptions.includes(toCurrency) ? toCurrency : payFromOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toCurrency, payFromOptions.join(",")]);
  const idLabel = R[`idType_${idType}` as keyof typeof R];
  const chosenAgent = agents?.find((a) => a.id === agentId) ?? allAgents?.find((a) => a.id === agentId) ?? null;

  const basicsOk = fullName.trim().length >= 2 && phone.trim().length >= 7 && !!country && !!city.trim() && address.trim().length >= 5;
  const channelOk = method === "mobile_money" ? !!provider && (account || phone).trim().length >= 7
    : method === "bank" ? !!provider.trim() && account.replace(/\s/g, "").length >= 8
    : method === "cash_pickup" ? idNumber.trim().length >= 4 && agents !== null
    : false;

  const showAllInCountry = async () => {
    try { setAllAgents(await listPickupPoints({ country, currency: toCurrency, lat: coords?.lat, lng: coords?.lng })); } catch { setAllAgents([]); }
  };

  const pick = (r: Receiver) => {
    setFullName(r.fullName); setPhone(r.phone ?? ""); setCountry(r.country ?? ""); setCity(r.city ?? ""); setAddress(r.address ?? ""); setEmail(r.email ?? "");
    setMethod(r.deliveryMethod); setProvider(r.provider ?? ""); setAccount(r.deliveryMethod === "bank" ? r.account : ""); setIdType(r.idType ?? ID_TYPES[0]); setIdNumber(r.idNumber ?? "");
  };

  const confirm = async () => {
    if (!userId || !method) return;
    if (!(await requireStepUp())) { setMessage(mfaCopy(locale).codeInvalid); return; }
    setBusy(true); setMessage(null);
    try {
      const r = await sendToNewReceiver({
        senderId: userId, amount: numAmt, from, note: note.trim() || undefined, agentId: method === "cash_pickup" ? agentId ?? undefined : undefined,
        fullName: fullName.trim(), phone: phone.trim(), country, city: city.trim(), address: address.trim(), email: email.trim() || undefined,
        currency: toCurrency, deliveryMethod: method,
        provider: method === "cash_pickup" ? undefined : provider.trim(), account: method === "bank" ? account.trim() : method === "mobile_money" ? (account || phone).trim() : undefined,
        idType: method === "cash_pickup" ? idType : undefined, idNumber: method === "cash_pickup" ? idNumber.trim() : undefined,
      });
      setReceipt(r); setStep("success"); reloadLists();
      void loadSendContext(userId).then(setCtx).catch(() => undefined);
    } catch (e) { setMessage(errText(e, R.failed)); } finally { setBusy(false); }
  };

  const goBack = step === "how" ? () => setStep("who") : step === "amount" ? () => setStep("how") : step === "confirm" ? () => setStep("amount") : onBack;
  const field = (id: string, label: string, control: React.ReactNode) => <div className="field"><label htmlFor={id}>{label}</label>{control}</div>;
  const M = (m: string) => R[`method_${m}` as keyof typeof R];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={step === "who" || step === "success" ? D.back : R.back} onClick={goBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 680, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{R.title}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{R.subtitle}</p>
        {!userId && <div className="tag tag-neutral">{D.sendPage.signIn}</div>}
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}

        {userId && step === "who" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {receivers.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{R.saved}</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {receivers.slice(0, 8).map((r) => <button key={r.id} type="button" className="btn btn-ghost" onClick={() => pick(r)}>{r.fullName} · {M(r.deliveryMethod)}{r.city ? ` · ${r.city}` : ""}</button>)}
                </div>
              </div>
            )}
            <div className="card elev-sm" style={{ gap: 10 }}>
              <strong style={{ fontSize: 13 }}>{R.step_who}</strong>
              {field("nr-name", R.fullName, <input id="nr-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                {field("nr-phone", R.phone, <input id="nr-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={country ? `+${callingCodeForCountry(country)} …` : "+…"} />)}
                {field("nr-email", R.email, <input id="nr-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
                {field("nr-country", R.country, (
                  <select id="nr-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">—</option>{COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                ))}
                {field("nr-city", R.city, <input id="nr-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />)}
              </div>
              {field("nr-addr", R.fullAddress, <input id="nr-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />)}
              <div className="text-muted" style={{ fontSize: 12 }}>{R.addressHint}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{R.emailHint}</div>
            </div>

            {member && (
              <div className="card elev-sm" role="status" style={{ gap: 6, background: "#E7F3EC" }}>
                <strong>✓ {R.memberFound.replace("{name}", member.name)}</strong>
                <div style={{ fontSize: 13 }}>{R.memberPerks}</div>
                <div><button type="button" className="btn btn-primary" onClick={() => onSendToMember(member)}>{R.sendToWallet}</button></div>
              </div>
            )}

            <div><button type="button" className="btn btn-primary" onClick={() => { if (basicsOk) { setMessage(null); setStep("how"); } else setMessage(R.requiredBasics); }}>{R.continue}</button></div>

            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 13 }}>{R.payouts}</strong>
              {payouts.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>{R.noPayouts}</div>}
              {payouts.slice(0, 5).map((p) => (
                <div key={p.id} className="card elev-sm" style={{ gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{p.receiverName}</strong><span>{fmt(p.receiveAmount)} {p.toCurrency} <span style={STATUS_CHIP[p.status]}>{R[`status_${p.status}` as keyof typeof R]}</span></span>
                  </div>
                  <span className="text-muted" style={{ fontSize: 12 }}>{M(p.deliveryMethod)} · {p.accountMasked} · {new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.agentName && <span className="text-muted" style={{ fontSize: 12 }}>{p.agentName}{p.agentAddress ? ` — ${p.agentAddress}` : ""}</span>}
                  {p.pickupCode && <span style={{ fontFamily: "monospace", fontSize: 13 }}>{R.pickupCode}: {p.pickupCode}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {userId && step === "how" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div className="card elev-sm" style={{ gap: 2 }}><strong>{fullName}</strong><span className="text-muted" style={{ fontSize: 12 }}>{phone} · {city}, {country}</span></div>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 13 }}>{R.step_how}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {METHODS.map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} disabled={!methodAvailable(m)} className={method === m ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setMethod(m)}>
                    {M(m)} <span style={{ fontWeight: 400, fontSize: 11 }}>· {methodAvailable(m) ? channelHint(m) : R.notConnected.replace("{country}", country)}</span>
                  </button>
                ))}
              </div>
              {toCurrency && <div className="text-muted" style={{ fontSize: 12 }}>{R.receivesIn.replace("{currency}", toCurrency)}</div>}
            </div>

            {method && (
              <div className="card elev-sm" style={{ gap: 10 }}>
                <strong style={{ fontSize: 13 }}>{R.extraNeeded.replace("{method}", String(M(method)))}</strong>
                {method === "mobile_money" && (
                  <>
                    {field("nr-prov", R.provider, <select id="nr-prov" className="input" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="">—</option>{mmProviders.map((p) => <option key={p} value={p}>{p}</option>)}</select>)}
                    {field("nr-mm", R.mmNumber, <input id="nr-mm" className="input" inputMode="tel" value={account} onChange={(e) => setAccount(e.target.value)} placeholder={phone} />)}
                    <div className="text-muted" style={{ fontSize: 12 }}>{R.mmHint}</div>
                  </>
                )}
                {method === "bank" && (
                  <>
                    {field("nr-bank", R.bankName, <>
                      <input id="nr-bank" className="input" list="nr-banks" value={provider} onChange={(e) => setProvider(e.target.value)} />
                      <datalist id="nr-banks">{bankNames.map((b) => <option key={b} value={b} />)}</datalist>
                    </>)}
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
                    <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 6 }}>
                      <strong style={{ fontSize: 13 }}>📍 {R.agents_title.replace("{city}", city)}</strong>
                      {agents === null && <div className="text-muted" style={{ fontSize: 12 }}>{R.agents_searching}</div>}
                      {agents && agents.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>{R.agents_none}</div>}
                      {agents && agents.length > 0 && <div className="text-muted" style={{ fontSize: 12 }}>{located ? R.agents_located : R.agents_byCity}</div>}
                      {(agents ?? []).map((a) => (
                        <button key={a.id} type="button" aria-pressed={agentId === a.id} className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 2, outline: agentId === a.id ? "2px solid var(--color-primary, #1D3F6B)" : "none" }} onClick={() => setAgentId(a.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <strong>{a.name}</strong>
                            <span style={a.kind === "payrus_direct" ? chip("#DDF3E8", "#1B6B45") : chip("#E7EEF7", "#1D3F6B")}>{a.kind === "payrus_direct" ? R.agents_direct : R.agents_correspondent}</span>
                          </div>
                          <span className="text-muted" style={{ fontSize: 12 }}>{a.address}, {a.city}{a.distanceKm != null ? ` · ${R.agents_away.replace("{km}", String(a.distanceKm))}` : a.matchLevel === "city" ? ` · ${R.agents_sameCity}` : ""}</span>
                          {(a.hours || a.phone) && <span className="text-muted" style={{ fontSize: 11 }}>{[a.hours, a.phone].filter(Boolean).join(" · ")}</span>}
                        </button>
                      ))}
                      <div className="text-muted" style={{ fontSize: 12 }}>{R.pickupAnywhere.replace("{country}", country).replace("{currency}", toCurrency)}</div>
                      {agents !== null && allAgents === null && <div><button type="button" className="btn btn-ghost" onClick={() => void showAllInCountry()}>{R.agents_showAll}</button></div>}
                      {allAgents && (
                        <div style={{ display: "grid", gap: 6 }}>
                          <strong style={{ fontSize: 12 }}>{R.agents_allTitle}</strong>
                          {allAgents.filter((a) => !(agents ?? []).some((x) => x.id === a.id)).map((a) => (
                            <button key={a.id} type="button" aria-pressed={agentId === a.id} className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 2, outline: agentId === a.id ? "2px solid var(--color-primary, #1D3F6B)" : "none" }} onClick={() => setAgentId(a.id)}>
                              <strong>{a.name} <span className="text-muted" style={{ fontWeight: 400 }}>· {a.kind === "payrus_direct" ? R.agents_direct : R.agents_correspondent}{a.scope === "zone" ? ` · ${a.country} · ${R.agents_zoneTag}` : a.scope === "abroad" ? ` · ${a.country} · ${R.agents_abroadTag.replace("{currency}", a.pickupCurrency ?? "")}` : ""}</span></strong>
                              <span className="text-muted" style={{ fontSize: 12 }}>{a.address}, {a.city}{a.distanceKm != null ? ` · ${R.agents_away.replace("{km}", String(a.distanceKm))}` : ""}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <div><button type="button" className="btn btn-primary" disabled={!channelOk} onClick={() => setStep("amount")}>{R.continue}</button></div>
          </div>
        )}

        {userId && step === "amount" && method && (
          <div className="card elev-sm" style={{ gap: 10 }}>
            <div><div className="card-title">{fullName}</div><div className="text-muted" style={{ fontSize: 12 }}>{M(method)}{provider ? ` · ${provider}` : ""} · {city}, {country}{chosenAgent ? ` · ${chosenAgent.name}` : ""}</div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label htmlFor="nr-amt">{R.youSend}</label><input id="nr-amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div className="field"><label htmlFor="nr-from">{R.payFrom}</label><select id="nr-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{(payFromOptions.length > 0 ? payFromOptions : [from]).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            {field("nr-note", R.note, <input id="nr-note" className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />)}
            <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 4, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">{R.fee}</span><span>{fmt(fee)} {from}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">{R.theyGet}</span><strong>{fmt(receives)} {toCurrency || from}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{R.total}</strong><strong>{fmt(total)} {from}</strong></div>
              {wallet && <div className="text-muted" style={{ fontSize: 12 }}>{R.balance}: {fmt(wallet.balance)} {from}</div>}
              {short && <div style={{ color: "#A3243B", fontSize: 12 }}>{R.insufficient}</div>}
              {cq?.deliveryTime && <div className="text-muted" style={{ fontSize: 12 }}>{R.deliveryLabel}: {R[`delivery_${cq.deliveryTime}` as keyof typeof R]}</div>}
              <div className="text-muted" style={{ fontSize: 11 }}>{R.priceNote}</div>
              {noRouteAtAll && <div style={{ color: "#A3243B", fontSize: 12 }}>{R.noRouteAny.replace("{to}", toCurrency)}</div>}
              {blocked && <div style={{ color: "#A3243B", fontSize: 12 }}>{blocked === "not_offered" ? R.noRoute.replace("{from}", from).replace("{to}", toCurrency) : `${R.failed} (${blocked.replace(/_/g, " ")})`}</div>}
            </div>
            {numAmt > 0 && chOptions && chOptions.filter((o) => o.available).length > 1 && (
              <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 12 }}>{R.compare}</strong>
                {chOptions.filter((o) => o.available).map((o) => (
                  <div key={o.method} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", fontSize: 13, padding: "6px 8px", borderRadius: 8, background: o.method === method ? "#E7F3EC" : undefined }}>
                    <strong>{M(o.method)}</strong>
                    <span className="text-muted">{o.fee != null ? `${fmt(o.fee)} ${from}` : ""} · {o.deliveryTime ? R[`delivery_${o.deliveryTime}` as keyof typeof R] : ""}</span>
                    {o.method === method ? <span style={{ fontSize: 11, fontWeight: 700 }}>{R.selected}</span>
                      : <button type="button" className="btn btn-ghost" onClick={() => { setMethod(o.method); setProvider(""); setAccount(""); setStep("how"); }}>{R.choose}</button>}
                  </div>
                ))}
              </div>
            )}
            <div><button type="button" className="btn btn-primary" disabled={numAmt <= 0 || short || !!blocked || noRouteAtAll || !cq} onClick={() => setStep("confirm")}>{R.review}</button></div>
          </div>
        )}

        {userId && step === "confirm" && method && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            <div className="card-title">{R.review}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13 }}>
              <span className="text-muted">{R.to}</span><span>{fullName}</span>
              <span className="text-muted">{R.phone}</span><span>{phone}</span>
              <span className="text-muted">{R.countryLabel}</span><span>{city}, {country}</span>
              <span className="text-muted">{R.methodLabel}</span><span>{[M(method), provider].filter(Boolean).join(" · ")}</span>
              {method === "cash_pickup" && (<><span className="text-muted">{R.idNumber}</span><span>{idLabel} {idNumber}</span>{chosenAgent && (<><span className="text-muted">{R.pickupPoint}</span><span>{chosenAgent.name}, {chosenAgent.address}</span></>)}</>)}
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
                {receipt.agentName && <div style={{ fontSize: 13, fontWeight: 600 }}>{R.pickupAt.replace("{agent}", receipt.agentName).replace("{address}", receipt.agentAddress ?? "")}</div>}
                <div className="text-muted" style={{ fontSize: 12 }}>{R.pickupAnywhere.replace("{country}", country).replace("{currency}", toCurrency)}</div>
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

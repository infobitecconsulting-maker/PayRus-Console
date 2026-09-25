import { useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { confirmPickup, type PickupResult } from "../lib/p2p.ts";

// Agent counter: pays out a cash pickup after the code AND the receiver's ID
// number both match (payout_confirm_pickup, migration 0038).
export function Pickup({ D, locale, setLocale, onBack, onLogoClick }: { D: Desk; locale: Locale; setLocale: (l: Locale) => void; onBack: () => void; onLogoClick: () => void }) {
  const R = D.receiverPage;
  const [code, setCode] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PickupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await confirmPickup(code.trim(), idNumber.trim());
      setResult(r);
      if (r.ok) { setCode(""); setIdNumber(""); }
    } catch (e) { setError(/only agents/i.test(e instanceof Error ? e.message : "") ? R.pickup_notAllowed : e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : R.failed); }
    finally { setBusy(false); }
  };

  const text = !result ? null
    : result.ok ? R.pickup_paid.replace("{amount}", `${(result.amount ?? 0).toLocaleString()} ${result.currency ?? ""}`).replace("{name}", result.receiverName ?? "")
    : result.reason === "id_mismatch" ? R.pickup_mismatch : result.reason === "blocked" ? R.pickup_blocked : R.pickup_notFound;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={D.back} onClick={onBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 560, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{R.pickup_title}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{R.pickup_intro}</p>
        <div className="card elev-sm" style={{ gap: 10 }}>
          <div className="field"><label htmlFor="pk-code">{R.pickup_code}</label><input id="pk-code" className="input" inputMode="numeric" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="off" /></div>
          <div className="field"><label htmlFor="pk-id">{R.pickup_id}</label><input id="pk-id" className="input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} autoComplete="off" /></div>
          <div><button type="button" className="btn btn-primary" disabled={busy || code.length !== 8 || idNumber.trim().length < 4} onClick={() => void submit()}>{R.pickup_confirm}</button></div>
        </div>
        {text && <div className="tag tag-neutral" role="status" style={{ marginTop: "var(--space-3)", color: result?.ok ? "#1B6B45" : "#A3243B" }}>{text}</div>}
        {error && <div className="tag tag-neutral" role="status" style={{ marginTop: "var(--space-3)" }}>{error}</div>}
      </div>
    </div>
  );
}

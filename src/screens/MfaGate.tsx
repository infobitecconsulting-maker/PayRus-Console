import { useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { MfaCodeForm, mfaCopy } from "../components/Mfa.tsx";
import { verifyTotpCode } from "../lib/mfa.ts";

// Shown between a correct password (session is only AAL1) and the app when the
// account has a verified TOTP factor — same gate App/'s sign-in dialog applies.
export function MfaGate({ D, locale, setLocale, onVerified, onCancel, onLogoClick }: {
  D: Desk; locale: Locale; setLocale: (l: Locale) => void; onVerified: () => void; onCancel: () => void; onLogoClick: () => void;
}) {
  const C = mfaCopy(locale);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--auth-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-6)" }}>
        <BackButton label={D.back} onClick={onCancel} />
        <LocaleMenu value={locale} onChange={setLocale} variant="auth" />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", padding: "0 var(--space-6) var(--space-8)", maxWidth: 420, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <PayRusLogo size={140} onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />
        <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>{C.signinTitle}</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--auth-body)" }}>{C.signinDesc}</p>
        </div>
        <MfaCodeForm label={C.verify} busy={busy} error={error} onSubmit={async (code) => {
          setBusy(true); setError(null);
          const ok = await verifyTotpCode(code);
          setBusy(false);
          if (ok) onVerified(); else setError(C.codeInvalid);
        }} />
      </div>
    </div>
  );
}

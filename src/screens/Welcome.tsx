import { useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { LOCALES } from "../i18n.ts";
import { BackButton, PayRusLogo, SegGroup } from "../components/parts.tsx";
import { supabase } from "../lib/supabase-client.ts";
import { OAUTH_PROVIDERS, signInWithOAuthProvider, type OAuthProviderId } from "../lib/supabase-providers.ts";

type SecondaryPanel = "magic" | "phone" | "sso" | null;

// Visual language AND feature set borrowed from App/'s login module
// (src/pages/welcome and signin/page.tsx): password sign-in, magic link,
// phone OTP, domain SSO and OAuth all live here too, behind the same
// progressive-disclosure toggle pattern — not just the same look.
export function Welcome({
  D,
  locale,
  setLocale,
  onBack,
  onSignIn,
  onRegister,
  onLogoClick,
  ssoError,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onBack: () => void;
  onSignIn: (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => void;
  onRegister: () => void;
  onLogoClick: () => void;
  ssoError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProviderId | null>(null);
  const [panel, setPanel] = useState<SecondaryPanel>(null);
  const [error, setError] = useState<string | null>(ssoError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  // Magic link
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Phone OTP
  const [phoneStep, setPhoneStep] = useState<"input" | "codeSent">("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);

  // Enterprise SSO
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoSending, setSsoSending] = useState(false);

  // ssoError arrives asynchronously from App.tsx's session-on-mount effect,
  // which resolves after this screen has already rendered — sync it in
  // rather than relying on the initial useState value alone.
  useEffect(() => {
    if (ssoError) setError(ssoError);
  }, [ssoError]);

  const togglePanel = (next: Exclude<SecondaryPanel, null>) => {
    setError(null);
    setNotice(null);
    setPanel((p) => (p === next ? null : next));
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError(D.signInFailed);
      return;
    }
    setError(null);
    setNotice(null);
    setChecking(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError(D.signInFailed);
        return;
      }
      onSignIn(data.session);
    } finally {
      setChecking(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(D.signInFailed);
      return;
    }
    setError(null);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    } finally {
      setNotice(D.resetLinkSent);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError(D.signInFailed);
      return;
    }
    setError(null);
    setMagicSending(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setMagicSent(true);
    } finally {
      setMagicSending(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      setError(D.phoneOtpNumberLabel);
      return;
    }
    setError(null);
    setPhoneSending(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ phone: phoneNumber.trim() });
      if (authError) {
        setError(authError.message);
        return;
      }
      setPhoneStep("codeSent");
      setNotice(D.phoneOtpSent);
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim()) return;
    setError(null);
    setPhoneSending(true);
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({
        phone: phoneNumber.trim(), token: phoneCode.trim(), type: "sms",
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      onSignIn(data.session);
    } finally {
      setPhoneSending(false);
    }
  };

  const handleSsoContinue = async () => {
    const domain = ssoEmail.trim().split("@")[1];
    if (!domain) {
      setError(D.ssoInvalidEmail);
      return;
    }
    setError(null);
    setSsoSending(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithSSO({
        domain,
        options: { redirectTo: window.location.origin },
      });
      if (authError || !data?.url) {
        setError(D.ssoFailed);
        return;
      }
      window.location.href = data.url;
    } finally {
      setSsoSending(false);
    }
  };

  const handleOAuthClick = async (provider: OAuthProviderId) => {
    setOauthPending(provider);
    setError(null);
    try {
      await signInWithOAuthProvider(provider);
    } catch {
      setError(D.signInFailed);
      setOauthPending(null);
    }
  };

  const secondaryButtonStyle = { background: "none", border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--auth-blue)" };
  const panelInputStyle = { borderRadius: 10, borderColor: "var(--auth-border)" };
  const panelActionStyle = (busy: boolean) => ({
    borderRadius: 10, border: 0, background: "#EDF2F5", color: "var(--auth-navy)", fontWeight: 700, fontSize: 13,
    padding: "10px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--auth-bg)",
        backgroundImage: "radial-gradient(rgba(10,47,92,0.06) 1px, transparent 1.2px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-6)" }}>
        <BackButton label={D.back} onClick={onBack} />
        <SegGroup label={D.language} value={locale} onChange={setLocale} options={LOCALES.map((l) => ({ value: l.code, label: l.flag }))} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 420, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <PayRusLogo size={220} onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)", letterSpacing: 0 }}>
            {D.welcomeTitle}
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--auth-body)" }}>{D.welcomeSub}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%" }}>
          <div className="field">
            <label htmlFor="ops-email">{D.email}</label>
            <input
              className="input"
              id="ops-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ borderRadius: 12, borderColor: "var(--auth-border)" }}
            />
          </div>
          <div className="field">
            <label htmlFor="ops-password">{D.password}</label>
            <input
              className="input"
              id="ops-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSignIn(); }}
              style={{ borderRadius: 12, borderColor: "var(--auth-border)" }}
            />
          </div>

          <button type="button" onClick={() => void handleForgotPassword()} style={{ ...secondaryButtonStyle, alignSelf: "flex-end" }}>
            {D.forgotPassword}
          </button>

          {error && (
            <p style={{ margin: 0, fontSize: 12.5, color: "#C33F55", fontWeight: 600 }} role="alert">
              {error}
            </p>
          )}
          {notice && !error && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--auth-teal)", fontWeight: 600 }}>{notice}</p>
          )}

          <button
            type="button"
            disabled={checking}
            onClick={() => void handleSignIn()}
            style={{
              border: 0,
              borderRadius: 16,
              color: "#fff",
              fontFamily: "var(--font-auth-heading)",
              fontWeight: 700,
              fontSize: 15,
              textAlign: "center",
              padding: "14px",
              cursor: checking ? "default" : "pointer",
              opacity: checking ? 0.6 : 1,
              background: "var(--auth-gradient)",
              boxShadow: "0 10px 26px rgba(10,42,74,0.14)",
            }}
          >
            {checking ? D.checking : D.signIn}
          </button>

          <p style={{ margin: 0, textAlign: "center", fontSize: 12.5, color: "var(--auth-body)" }}>
            {D.noAccount}{" "}
            <button type="button" onClick={onRegister} style={{ background: "none", border: 0, cursor: "pointer", fontWeight: 700, fontSize: 12.5, color: "var(--auth-blue)" }}>
              {D.registerLink}
            </button>
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 2 }}>
            <button type="button" onClick={() => togglePanel("magic")} style={secondaryButtonStyle}>
              {D.magicLinkPrompt}
            </button>
            <button type="button" onClick={() => togglePanel("phone")} style={secondaryButtonStyle}>
              {D.phoneOtpPrompt}
            </button>
            <button type="button" onClick={() => togglePanel("sso")} style={secondaryButtonStyle}>
              {D.sso}
            </button>
          </div>

          {panel === "magic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", borderRadius: 12, border: "1px solid var(--auth-border)", background: "#fff", padding: "var(--space-4)" }}>
              {magicSent ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--auth-body)", textAlign: "center" }}>{D.magicLinkSent}</p>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--auth-body)" }}>{email || D.email}</p>
                  <button type="button" disabled={magicSending} onClick={() => void handleMagicLink()} style={panelActionStyle(magicSending)}>
                    {magicSending ? D.checking : D.magicLinkSend}
                  </button>
                </>
              )}
            </div>
          )}

          {panel === "phone" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", borderRadius: 12, border: "1px solid var(--auth-border)", background: "#fff", padding: "var(--space-4)" }}>
              <div className="field">
                <label htmlFor="ops-phone">{D.phoneOtpNumberLabel}</label>
                <input
                  className="input"
                  id="ops-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={phoneStep === "codeSent"}
                  placeholder="+221 77 000 00 00"
                  style={panelInputStyle}
                />
              </div>
              {phoneStep === "input" ? (
                <button type="button" disabled={phoneSending} onClick={() => void handleSendPhoneCode()} style={panelActionStyle(phoneSending)}>
                  {phoneSending ? D.checking : D.phoneOtpSendCode}
                </button>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="ops-phone-code">{D.phoneOtpCodeLabel}</label>
                    <input
                      className="input"
                      id="ops-phone-code"
                      inputMode="numeric"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      placeholder="000000"
                      style={{ ...panelInputStyle, textAlign: "center", letterSpacing: "0.3em" }}
                    />
                  </div>
                  <button type="button" disabled={phoneSending} onClick={() => void handleVerifyPhoneCode()} style={panelActionStyle(phoneSending)}>
                    {phoneSending ? D.checking : D.phoneOtpVerify}
                  </button>
                </>
              )}
            </div>
          )}

          {panel === "sso" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", borderRadius: 12, border: "1px solid var(--auth-border)", background: "#fff", padding: "var(--space-4)" }}>
              <div className="field">
                <label htmlFor="ops-sso-email">{D.ssoWorkEmailLabel}</label>
                <input
                  className="input"
                  id="ops-sso-email"
                  type="email"
                  value={ssoEmail}
                  onChange={(e) => setSsoEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={panelInputStyle}
                />
              </div>
              <button type="button" disabled={ssoSending} onClick={() => void handleSsoContinue()} style={panelActionStyle(ssoSending)}>
                {ssoSending ? D.checking : D.ssoContinueButton}
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ height: 1, flex: 1, background: "var(--auth-border)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--auth-muted)" }}>{D.orDivider}</span>
            <div style={{ height: 1, flex: 1, background: "var(--auth-border)" }} />
          </div>

          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--auth-body)", textAlign: "center", marginBottom: -2 }}>
            {D.quickSignInTitle}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {OAUTH_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={oauthPending !== null}
                onClick={() => void handleOAuthClick(p.id)}
                aria-label={p.label}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: 0, cursor: oauthPending ? "default" : "pointer", opacity: oauthPending && oauthPending !== p.id ? 0.5 : 1 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, background: p.bg, border: "1px solid var(--auth-border)" }}>
                  {p.initial}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--auth-body)" }}>{oauthPending === p.id ? D.checking : p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: "var(--auth-muted)", textAlign: "center" }}>{D.termsNote}</p>
      </div>
    </div>
  );
}

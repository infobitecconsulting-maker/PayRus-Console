import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "../types.ts";
import {
  confirmTotpEnrollment, enrollTotp, listVerifiedTotp, registerStepUpHost, removeTotp, requireStepUp, verifyTotpCode, type TotpFactor,
} from "../lib/mfa.ts";

interface Copy {
  title: string; enabledStatus: string; notEnabled: string; enable: string; disable: string; scanQr: string; orEnterSecret: string;
  verify: string; codeInvalid: string; enabledToast: string; disabledToast: string; enrolFailed: string;
  staffRequiredTitle: string; staffRequiredDesc: string; staffContinue: string; stepUpTitle: string; stepUpDesc: string; signinTitle: string; signinDesc: string; staffRecommend: string; cancel: string;
}
// Same wording as App/'s mfa.* keys (App/src/locales/*/common.json).
const COPY: Record<Locale, Copy> = {
  en: { staffRequiredTitle: "Two-factor authentication required", staffRequiredDesc: "Administrative access needs a verified authenticator app. Enable it below to continue.", staffContinue: "Continue", title: "Two-factor authentication (authenticator app)", enabledStatus: "Enabled — a 6-digit code is required at sign-in and for high-risk actions", notEnabled: "Not enabled — add an authenticator app for stronger protection", enable: "Enable", disable: "Disable", scanQr: "Scan this QR code with Google Authenticator, Authy or a similar app, then enter the 6-digit code.", orEnterSecret: "Or enter this key manually:", verify: "Verify", codeInvalid: "Invalid code. Please try again.", enabledToast: "Two-factor authentication enabled", disabledToast: "Two-factor authentication disabled", enrolFailed: "Could not update two-factor authentication", stepUpTitle: "Confirm it's you", stepUpDesc: "Enter the 6-digit code from your authenticator app to continue.", signinTitle: "Two-factor verification", signinDesc: "Enter the 6-digit code from your authenticator app to finish signing in.", staffRecommend: "Staff and admin accounts should enable this.", cancel: "Cancel" },
  fr: { staffRequiredTitle: "Authentification à deux facteurs requise", staffRequiredDesc: "L'accès administrateur exige une application d'authentification vérifiée. Activez-la ci-dessous pour continuer.", staffContinue: "Continuer", title: "Authentification à deux facteurs (application d'authentification)", enabledStatus: "Activée — un code à 6 chiffres est requis à la connexion et pour les actions sensibles", notEnabled: "Non activée — ajoutez une application d'authentification pour une meilleure protection", enable: "Activer", disable: "Désactiver", scanQr: "Scannez ce QR code avec Google Authenticator, Authy ou une application similaire, puis saisissez le code à 6 chiffres.", orEnterSecret: "Ou saisissez cette clé manuellement :", verify: "Vérifier", codeInvalid: "Code invalide. Veuillez réessayer.", enabledToast: "Authentification à deux facteurs activée", disabledToast: "Authentification à deux facteurs désactivée", enrolFailed: "Impossible de modifier l'authentification à deux facteurs", stepUpTitle: "Confirmez votre identité", stepUpDesc: "Saisissez le code à 6 chiffres de votre application d'authentification pour continuer.", signinTitle: "Vérification à deux facteurs", signinDesc: "Saisissez le code à 6 chiffres de votre application d'authentification pour terminer la connexion.", staffRecommend: "Les comptes du personnel et administrateurs devraient l'activer.", cancel: "Annuler" },
  pt: { staffRequiredTitle: "Autenticação de dois fatores obrigatória", staffRequiredDesc: "O acesso administrativo exige uma aplicação de autenticação verificada. Ative-a abaixo para continuar.", staffContinue: "Continuar", title: "Autenticação de dois fatores (aplicação de autenticação)", enabledStatus: "Ativada — é exigido um código de 6 dígitos no início de sessão e em ações sensíveis", notEnabled: "Não ativada — adicione uma aplicação de autenticação para maior proteção", enable: "Ativar", disable: "Desativar", scanQr: "Leia este código QR com o Google Authenticator, Authy ou uma aplicação semelhante e introduza o código de 6 dígitos.", orEnterSecret: "Ou introduza esta chave manualmente:", verify: "Verificar", codeInvalid: "Código inválido. Tente novamente.", enabledToast: "Autenticação de dois fatores ativada", disabledToast: "Autenticação de dois fatores desativada", enrolFailed: "Não foi possível alterar a autenticação de dois fatores", stepUpTitle: "Confirme a sua identidade", stepUpDesc: "Introduza o código de 6 dígitos da sua aplicação de autenticação para continuar.", signinTitle: "Verificação de dois fatores", signinDesc: "Introduza o código de 6 dígitos da sua aplicação de autenticação para concluir o início de sessão.", staffRecommend: "As contas de pessoal e administradores devem ativá-la.", cancel: "Cancelar" },
  es: { staffRequiredTitle: "Autenticación de dos factores obligatoria", staffRequiredDesc: "El acceso administrativo exige una aplicación de autenticación verificada. Actívela abajo para continuar.", staffContinue: "Continuar", title: "Autenticación de dos factores (aplicación de autenticación)", enabledStatus: "Activada — se exige un código de 6 dígitos al iniciar sesión y en acciones sensibles", notEnabled: "No activada — añada una aplicación de autenticación para mayor protección", enable: "Activar", disable: "Desactivar", scanQr: "Escanee este código QR con Google Authenticator, Authy o una aplicación similar e introduzca el código de 6 dígitos.", orEnterSecret: "O introduzca esta clave manualmente:", verify: "Verificar", codeInvalid: "Código no válido. Inténtelo de nuevo.", enabledToast: "Autenticación de dos factores activada", disabledToast: "Autenticación de dos factores desactivada", enrolFailed: "No se pudo modificar la autenticación de dos factores", stepUpTitle: "Confirme su identidad", stepUpDesc: "Introduzca el código de 6 dígitos de su aplicación de autenticación para continuar.", signinTitle: "Verificación de dos factores", signinDesc: "Introduzca el código de 6 dígitos de su aplicación de autenticación para completar el inicio de sesión.", staffRecommend: "Las cuentas de personal y administradores deberían activarla.", cancel: "Cancelar" },
};
export const mfaCopy = (l: Locale): Copy => COPY[l] ?? COPY.en;

export function MfaCodeForm({ onSubmit, busy, label, error }: { onSubmit: (code: string) => void; busy?: boolean; label: string; error?: string | null }) {
  const [code, setCode] = useState("");
  return (
    <form style={{ display: "grid", gap: 10, width: "100%" }} onSubmit={(e) => { e.preventDefault(); if (code.length === 6) onSubmit(code); }}>
      <input
        className="input" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" aria-label={label}
        value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        style={{ textAlign: "center", fontSize: 20, letterSpacing: "0.5em", fontFamily: "monospace" }}
      />
      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "#C33F55", fontWeight: 600 }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>{label}</button>
    </form>
  );
}

/** Mounted once in the signed-in console; requireStepUp() opens it. */
export function MfaStepUpHost({ locale }: { locale: Locale }) {
  const C = mfaCopy(locale);
  const [resolver, setResolver] = useState<((ok: boolean) => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    registerStepUpHost((resolve) => { setError(null); setResolver(() => resolve); });
    return () => registerStepUpHost(null);
  }, []);
  if (!resolver) return null;
  const close = (ok: boolean) => { resolver(ok); setResolver(null); };
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(10,47,92,0.45)", display: "grid", placeItems: "center", zIndex: 1000 }}>
      <div className="card elev-sm" style={{ gap: 10, maxWidth: 360, width: "calc(100% - 32px)", background: "var(--color-surface, #fff)" }}>
        <div className="card-title">{C.stepUpTitle}</div>
        <p className="card-body">{C.stepUpDesc}</p>
        <MfaCodeForm label={C.verify} error={error} onSubmit={async (code) => { if (await verifyTotpCode(code)) close(true); else setError(C.codeInvalid); }} />
        <button type="button" className="btn btn-ghost" onClick={() => close(false)}>{C.cancel}</button>
      </div>
    </div>
  );
}

/** Settings → Security card: real enrolment/removal, same factor the App uses. */
export function MfaSettingsCard({ locale, recommend, onMessage }: { locale: Locale; recommend?: boolean; onMessage: (m: string) => void }) {
  const C = mfaCopy(locale);
  const [factors, setFactors] = useState<TotpFactor[] | null>(null);
  const [enrol, setEnrol] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => listVerifiedTotp().then(setFactors).catch(() => setFactors([]));
  useEffect(() => { void refresh(); }, []);
  const enabled = (factors?.length ?? 0) > 0;
  return (
    <div className="card elev-sm" style={{ gap: 8 }}>
      <div className="card-title">{C.title}</div>
      <p className="card-body">{enabled ? C.enabledStatus : C.notEnabled}</p>
      {recommend && !enabled && <p className="card-body" style={{ color: "#C33F55" }}>{C.staffRecommend}</p>}
      {factors !== null && !enrol && (
        <div>
          {enabled ? (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => {
              if (!(await requireStepUp())) return;
              setBusy(true);
              const ok = (await Promise.all(factors.map((f) => removeTotp(f.id)))).every(Boolean);
              setBusy(false);
              if (ok) { onMessage(C.disabledToast); void refresh(); } else onMessage(C.enrolFailed);
            }}>{C.disable}</button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => {
              setBusy(true); setError(null);
              try { setEnrol(await enrollTotp()); } catch { onMessage(C.enrolFailed); } finally { setBusy(false); }
            }}>{C.enable}</button>
          )}
        </div>
      )}
      {enrol && (
        <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
          <p className="card-body">{C.scanQr}</p>
          <img src={enrol.qrCode} alt="TOTP QR code" width={160} height={160} style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
          <p className="card-body" style={{ wordBreak: "break-all", textAlign: "center" }}>{C.orEnterSecret} <code>{enrol.secret}</code></p>
          <MfaCodeForm label={C.verify} busy={busy} error={error} onSubmit={async (code) => {
            setBusy(true);
            const ok = await confirmTotpEnrollment(enrol.factorId, code);
            setBusy(false);
            if (ok) { setEnrol(null); setError(null); onMessage(C.enabledToast); void refresh(); } else setError(C.codeInvalid);
          }} />
        </div>
      )}
    </div>
  );
}

/** Privileged screens (Administration, Configuration) need a verified factor and an AAL2 session. */
export function StaffMfaGate({ locale, onMessage, children }: { locale: Locale; onMessage: (m: string) => void; children: ReactNode }) {
  const C = mfaCopy(locale);
  const [state, setState] = useState<"checking" | "enrol" | "stepup" | "ok">("checking");
  const check = async () => {
    try {
      if ((await listVerifiedTotp()).length === 0) return setState("enrol");
      setState((await requireStepUp()) ? "ok" : "stepup");
    } catch {
      setState("enrol");
    }
  };
  useEffect(() => { void check(); }, []);
  if (state === "ok") return <>{children}</>;
  if (state === "checking") return null;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--space-6)", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{C.staffRequiredTitle}</h1>
      <p className="card-body">{C.staffRequiredDesc}</p>
      {state === "enrol" && <MfaSettingsCard locale={locale} onMessage={onMessage} />}
      <div><button type="button" className="btn btn-primary" onClick={() => { setState("checking"); void check(); }}>{C.staffContinue}</button></div>
    </div>
  );
}

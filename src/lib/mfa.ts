// Real MFA (PRS-IAM-003) on Supabase Auth TOTP — mirror of App/src/lib/mfa.ts so
// both platforms enrol, challenge and step up the same factors on the same
// Supabase identity: a factor enrolled in either app protects both.
import { supabase } from "./supabase-client.ts";

export interface TotpFactor { id: string; friendlyName?: string }

export async function listVerifiedTotp(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data.totp ?? []).map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? undefined }));
}

export async function needsMfaChallenge(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

export async function verifyTotpCode(code: string): Promise<boolean> {
  const factor = (await listVerifiedTotp())[0];
  if (!factor) return true;
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
  return !error;
}

export async function enrollTotp(): Promise<{ factorId: string; qrCode: string; secret: string }> {
  const { data: all } = await supabase.auth.mfa.listFactors();
  for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "PayRus authenticator" });
  if (error || !data) throw new Error(error?.message ?? "enroll failed");
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmTotpEnrollment(factorId: string, code: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  return !error;
}

export async function removeTotp(factorId: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return !error;
}

// Step-up for high-risk actions: true when no factor / already AAL2, otherwise
// asks the mounted <MfaStepUpHost/> for a fresh code.
type Opener = (resolve: (ok: boolean) => void) => void;
let opener: Opener | null = null;
export const registerStepUpHost = (fn: Opener | null) => { opener = fn; };

export async function requireStepUp(): Promise<boolean> {
  if (!(await needsMfaChallenge())) return true;
  if (!opener) return false;
  return new Promise<boolean>((resolve) => opener!(resolve));
}

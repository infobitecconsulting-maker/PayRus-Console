// Real file upload for the KYC step (Kyc.tsx) — ops-console has no Convex
// client, so it fetches an upload URL from App/'s shared Convex deployment
// (convex/http.ts's /kycUploadUrl route, which just wraps App's existing
// generateRegistrationDocUploadUrl mutation) and then POSTs the file bytes
// directly to that URL, exactly like App/'s own frontend does. The returned
// storageId is an opaque string persisted via identity.ts's upsertUserRole.
const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

export async function uploadKycFile(file: File): Promise<string | null> {
  if (!CONVEX_SITE_URL) return null;
  try {
    const urlRes = await fetch(`${CONVEX_SITE_URL}/kycUploadUrl`, { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!urlRes.ok) return null;
    const { uploadUrl } = (await urlRes.json()) as { uploadUrl?: string };
    if (!uploadUrl) return null;
    const uploadRes = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!uploadRes.ok) return null;
    const { storageId } = (await uploadRes.json()) as { storageId?: string };
    return storageId ?? null;
  } catch {
    return null;
  }
}

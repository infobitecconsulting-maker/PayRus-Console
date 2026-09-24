// Live-location helpers for the console (mirror of App/src/lib/location.ts).
// Coordinates are reverse-geocoded server-side (Convex /reverseGeocode) and
// never stored; only the resulting country code is saved, through the
// self-service update_my_location RPC (migration 0028). Following is opt-in
// and can be switched off in Settings.
import { supabase } from "./supabase-client.ts";

export const LOCATION_FOLLOW_KEY = "payrus_location_follow";
const LOCATION_CHECKED_KEY = "payrus_location_checked_at";
const RECHECK_MS = 6 * 60 * 60 * 1000;

export function getLocationFollow(): "on" | "off" | null {
  try {
    const v = localStorage.getItem(LOCATION_FOLLOW_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function setLocationFollow(value: "on" | "off"): void {
  try {
    localStorage.setItem(LOCATION_FOLLOW_KEY, value);
    window.dispatchEvent(new Event("payrus-fx-currency"));
  } catch { /* ignore */ }
}

export function getBrowserPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export interface ReverseLocation { country: string; city?: string; province?: string; postalCode?: string; area?: string }

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseLocation | null> {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (!site) return null;
  try {
    const res = await fetch(`${site}/reverseGeocode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lng }) });
    if (!res.ok) return null;
    return ((await res.json()) as { location: ReverseLocation | null }).location;
  } catch {
    return null;
  }
}

export interface SyncResult { country: string; currency: string | null; changed: boolean }

// Detect the current country and store it for the signed-in user when it
// differs from what is saved. Returns null when detection was not possible.
export async function syncLocation(userId: string): Promise<SyncResult | null> {
  const pos = await getBrowserPosition();
  const place = await reverseGeocode(pos.lat, pos.lng);
  try { localStorage.setItem(LOCATION_CHECKED_KEY, String(Date.now())); } catch { /* ignore */ }
  if (!place) return null;
  const saved = await supabase.from("users").select("location_country").eq("id", userId).maybeSingle();
  if ((saved.data?.location_country as string | null) === place.country) return { country: place.country, currency: null, changed: false };
  const res = await supabase.rpc("update_my_location", { p_country: place.country });
  if (res.error) throw new Error(res.error.message);
  const row = res.data as Record<string, unknown>;
  return { country: place.country, currency: (row.location_currency as string) ?? null, changed: true };
}

export function locationCheckIsDue(): boolean {
  try { return Date.now() - Number(localStorage.getItem(LOCATION_CHECKED_KEY) ?? 0) > RECHECK_MS; } catch { return true; }
}

export async function clearLocation(): Promise<void> {
  const res = await supabase.rpc("clear_my_location");
  if (res.error) throw new Error(res.error.message);
}

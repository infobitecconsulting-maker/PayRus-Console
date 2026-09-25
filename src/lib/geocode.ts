// Best-effort forward geocoding of a receiver's address (OpenStreetMap Nominatim),
// used only to propose the nearest payout agents. Never blocks the flow: on any
// failure the agent search falls back to matching by city and country.
export interface LatLng { lat: number; lng: number }

async function lookup(q: string, country: string): Promise<LatLng | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=${encodeURIComponent(country.toLowerCase())}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    const r = rows[0];
    return r?.lat && r?.lon ? { lat: Number(r.lat), lng: Number(r.lon) } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodeAddress(address: string, city: string, country: string): Promise<LatLng | null> {
  return (await lookup(`${address}, ${city}`, country)) ?? (await lookup(city, country));
}

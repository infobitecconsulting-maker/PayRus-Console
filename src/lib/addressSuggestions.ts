// Calls the same AI-backed address-suggestion logic as App/ (see
// App/convex/addressSuggestions.ts) via the plain HTTP routes App/ exposes at
// convex/http.ts — ops-console has no Convex client of its own, so a bare
// `fetch` against the shared deployment is simplest, mirroring how it
// already shares App/'s Supabase project rather than standing up its own
// backend. Any failure (network, unconfigured backend, bad response)
// degrades to an empty suggestion list rather than throwing.
const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

export interface PostalCodeSuggestion {
  postalCode: string;
  area?: string;
}

async function post<T>(path: string, body: unknown): Promise<T[]> {
  if (!CONVEX_SITE_URL) return [];
  try {
    const response = await fetch(`${CONVEX_SITE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { suggestions?: T[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export function suggestStreets(params: {
  country: string;
  city: string;
  province?: string;
  query: string;
}): Promise<string[]> {
  return post<string>("/addressSuggestions", params);
}

export function suggestPostalCodes(params: {
  country: string;
  city: string;
  province?: string;
}): Promise<PostalCodeSuggestion[]> {
  return post<PostalCodeSuggestion>("/postalCodeSuggestions", params);
}

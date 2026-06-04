import type { Publisher } from '../types';

const STORAGE_KEY = 'adstxt_publishers';

// ── localStorage helpers ─────────────────────────────────────────────────────

export function loadPublishers(): Publisher[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePublishers(publishers: Publisher[]): void {
  try {
    // Strip parseResult before saving (it's re-derived from content on load)
    const toSave = publishers.map(({ parseResult, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    console.warn('Failed to save to localStorage.');
  }
}

// ── CORS-free ads.txt fetcher ────────────────────────────────────────────────
// Uses public CORS proxies so the static site can fetch ads.txt from any domain

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export async function fetchAdsTxtViaProxy(url: string): Promise<string> {
  // Try direct fetch first (works for same-origin or CORS-enabled servers)
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (resp.ok) return resp.text();
  } catch {
    // expected — most domains block cross-origin requests
  }

  // Try CORS proxies
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(url);
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (resp.ok) return resp.text();
    } catch {
      continue;
    }
  }

  throw new Error('Could not fetch the URL. Verify it is correct and publicly accessible, or paste the content directly.');
}

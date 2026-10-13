const FALLBACK_API_URL = 'http://localhost:4000';

/** Accepts only an absolute http(s) URL, so a bad config cannot become a relative path. */
export function resolveApiUrl(candidate: unknown, fallback = FALLBACK_API_URL): string {
  if (typeof candidate !== 'string') {
    return fallback;
  }
  const trimmed = candidate.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/.+/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

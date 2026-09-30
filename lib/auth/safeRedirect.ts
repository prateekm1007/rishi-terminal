/**
 * R7: the ONLY sanctioned way to turn a client-supplied `?next=` value into
 * a post-login redirect target.
 *
 * Rules (fail closed to the fallback):
 * - Same-origin relative paths only: must start with exactly one '/'.
 * - '//' or '/\\' prefixes are protocol-relative URLs to another host — rejected.
 * - Any ':' rejects scheme URLs (javascript:, http:, data:) — rejected.
 * - The value is decoded ONCE and re-checked, so encoded forms
 *   ('%2F%2Fevil.com') cannot smuggle a protocol-relative URL past the
 *   prefix check. A malformed encoding falls back.
 * - Control characters, backslashes and whitespace tricks are rejected.
 * - Everything else falls back to '/'.
 *
 * This module is pure and framework-free so the unit tests cover the
 * canonical attack list from the spec exactly.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  let value = raw.trim();
  if (!value) return fallback;

  // Decode once; a malformed encoding falls back (never throws).
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  // Control characters are never legitimate in a redirect path.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Must be a relative path with exactly one leading slash.
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback; // protocol-relative → other host
  if (value.startsWith('/\\')) return fallback; // backslash variant

  // A colon anywhere means a scheme (javascript:, http:, data:) or a port
  // on a protocol-relative host — both rejected for a relative path.
  if (value.includes(':')) return fallback;

  // Backslashes can be normalized to slashes by some clients, turning
  // '/\evil.com' into '//evil.com' — keep them out entirely.
  if (value.includes('\\')) return fallback;

  // Allow-list the remaining characters: path, query and common safe marks.
  if (!/^[A-Za-z0-9/_.\-~?=&%+$@,;!*'()[\]]+$/.test(value)) return fallback;

  return value;
}

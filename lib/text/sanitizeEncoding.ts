/**
 * Rishi Terminal — Encoding Sanitizer
 * Repairs common mojibake (cp1252 misread as utf8) in text strings.
 * Safe to call on any string. No-op if text is already clean.
 */

const MOJIBAKE_MAP: [RegExp, string][] = [
  // Quotes
  [/\u00e2\u20ac\u2122/g, "\u2019"],   // '
  [/\u00e2\u20ac\u0153/g, "\u201c"],   // "
  [/\u00e2\u20ac\u009d/g, "\u201d"],   // "
  [/\u00e2\u20ac\u02dc/g, "\u2018"],   // '
  [/\u00e2\u20ac\u201e/g, "\u201e"],   // „

  // Dashes
  [/\u00e2\u20ac\u201d/g, "\u2014"],   // —
  [/\u00e2\u20ac\u201c/g, "\u2013"],   // –

  // Arrows
  [/\u00e2\u2020\u2019/g, "\u2192"],   // →
  [/\u00e2\u2020\u0090/g, "\u2190"],   // ←

  // Triangles
  [/\u00e2\u2013\u00b2/g, "\u25b2"],   // ▲
  [/\u00e2\u2013\u00bc/g, "\u25bc"],   // ▼

  // Currency
  [/\u00e2\u201a\u00bf/g, "\u20bf"],   // ₿
  [/\u00e2\u201a\u00b9/g, "\u20b9"],   // 
  [/\u00e2\u00ac/g,       "\u20ac"],   // €

  // Misc symbols
  [/\u00c2\u00b7/g, "\u00b7"],         // ·
  [/\u00e2\u20ac\u00a6/g, "\u2026"],   // …
  [/\u00e2\u20ac\u00a2/g, "\u2022"],   // •

  // Cleanup: lone Â before space or punctuation
  [/\u00c2(?=[\s\u00a0])/g, ""],

  // Cleanup: lone Ã followed by common accent pattern
  [/\u00c3\u00a9/g, "\u00e9"],         // é
  [/\u00c3\u00a8/g, "\u00e8"],         // è
  [/\u00c3\u00b1/g, "\u00f1"],         // ñ
  [/\u00c3\u00a7/g, "\u00e7"],         // ç
];

export function sanitizeEncoding(text: string): string {
  if (!text) return text;
  let s = text;
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function sanitizeBatch(items: string[]): string[] {
  return items.map(sanitizeEncoding);
}
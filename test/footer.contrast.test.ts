import { describe, it, expect } from 'vitest';
import { FOOTER_STRIP_COLORS } from '../components/ui/LegalDisclaimer';

/**
 * WCAG 2.1 contrast helpers (no runtime dependency — mirrors the spec formula).
 * https://www.w3.org/WAI/WCAG21/#contrast-ratiomath
 */
function channelToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb color: ${hex}`);
  const n = parseInt(m[1], 16);
  const r = channelToLinear((n >> 16) & 0xff);
  const g = channelToLinear((n >> 8) & 0xff);
  const b = channelToLinear(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Audit retest 2026-10-02, finding C.2:
 * the persistent footer disclaimer strip failed color-contrast on EVERY page
 * (#475569 on #070B14 at 10px = 2.59:1; WCAG AA requires 4.5:1 for text
 * under 18pt). It was the only a11y failure common to all routes.
 *
 * The colors are exported from the component so this test locks the pair
 * that actually renders, not a copy of it.
 */
describe('footer disclaimer strip contrast (LegalDisclaimer)', () => {
  it('declares #rrggbb constants', () => {
    expect(FOOTER_STRIP_COLORS.text).toMatch(/^#[0-9a-f]{6}$/i);
    expect(FOOTER_STRIP_COLORS.background).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('meets WCAG AA contrast (>= 4.5:1) — 10px fine print needs the full ratio', () => {
    const ratio = contrastRatio(FOOTER_STRIP_COLORS.text, FOOTER_STRIP_COLORS.background);
    expect(
      ratio,
      `footer text ${FOOTER_STRIP_COLORS.text} on ${FOOTER_STRIP_COLORS.background} = ${ratio.toFixed(2)}:1 (need >= 4.5:1)`
    ).toBeGreaterThanOrEqual(4.5);
  });
});

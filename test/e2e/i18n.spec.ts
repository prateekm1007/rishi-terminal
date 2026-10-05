/**
 * R4-06 (Round 15 B7) — i18n acceptance, verbatim from the roadmap:
 *
 *   npx playwright test test/e2e/i18n.spec.ts
 *   # -> switching language persists; pseudo-locale (expanded strings)
 *   #    shows no overflow on top 10 pages
 *
 * The pseudo-locale (messages/pseudo.json, every string bracketed and
 * expanded ~40% — regenerate with `node scripts/genPseudoLocale.mjs`)
 * stresses layouts the way long translations do. `pseudo` is not offered
 * in the LanguageSelector UI; tests reach it via localStorage, the same
 * persistence mechanism real locales use.
 */
import { expect, test } from '@playwright/test';

const TOP_TEN_PAGES = [
  '/',
  '/screener',
  '/stock/SBIN',
  '/stock/RELIANCE',
  '/stock/TCS',
  '/stock/INFY',
  '/rishis',
  '/chat',
  '/news',
  '/methodology',
];

test.describe('R4-06 i18n', () => {
  test('switching language persists across reloads', async ({ page }) => {
    await page.goto('/');

    // Open the selector (its trigger shows the current locale's native
    // name) and choose Hindi from the dropdown.
    const trigger = page.locator('button', { hasText: 'English' }).first();
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.click();
    await page.locator('button', { hasText: 'हिंदी' }).last().click();

    // Known translated strings render (nav switches to Hindi —
    // "डैशबोर्ड" = dashboard; the sidebar logo is brand text, not a
    // catalog key).
    await expect(page.getByText('डैशबोर्ड', { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    // Persistence: the same browser, reloaded, stays Hindi.
    await page.reload();
    await expect(page.getByText('डैशबोर्ड', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('rishi_locale'))).toBe('hi');

    // And back to English for hygiene.
    await page.evaluate(() => localStorage.setItem('rishi_locale', 'en'));
  });

  test('pseudo-locale (expanded strings) shows no overflow on the top 10 pages', async ({ browser }) => {
    for (const path of TOP_TEN_PAGES) {
      const context = await browser.newContext();
      await context.addInitScript(() => localStorage.setItem('rishi_locale', 'pseudo'));
      const page = await context.newPage();
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      // Wait until the pseudo catalog has actually been applied (an
      // expanded string is visible) — the locale loads asynchronously
      // after hydration.
      await expect
        .poll(
          async () => page.evaluate(() => document.body.innerText.includes('×××')),
          { timeout: 20_000 },
        )
        .toBe(true);

      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          path: location.pathname,
        };
      });
      // +1 tolerance for sub-pixel rounding.
      expect(
        overflow.scrollWidth,
        `${path}: expanded strings must not cause horizontal overflow (scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth})`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      await context.close();
    }
  });
});

/**
 * X3-09 (Round 15 B7) — PWA acceptance, verbatim from the roadmap:
 *
 *   "Accept: Playwright: manifest served and valid, service worker
 *    registers, offline navigation shows the offline page, API responses
 *    are not cached by the worker."
 *
 * Fail-first evidence: run before the PWA files exist — the manifest
 * request 404s and no service worker ever registers (pasted in the PR).
 */
import { expect, test } from '@playwright/test';

test.describe('X3-09 PWA', () => {
  test('manifest is served and valid', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status(), 'GET /manifest.webmanifest').toBe(200);
    const manifest = (await res.json()) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };
    expect(manifest.name, 'manifest.name').toBeTruthy();
    expect(manifest.short_name, 'manifest.short_name').toBeTruthy();
    expect(manifest.start_url, 'manifest.start_url').toBe('/');
    expect(manifest.display, 'manifest.display').toBe('standalone');

    // Valid icon set: at least one raster icon >= 192px, and the icon
    // files themselves must be fetchable.
    expect(manifest.icons?.length ?? 0, 'icons listed').toBeGreaterThan(0);
    const has192 = manifest.icons!.some((i) => {
      const m = /^(\d+)x\d+$/.exec(i.sizes ?? '');
      return m !== null && Number(m[1]) >= 192 && i.type === 'image/png';
    });
    expect(has192, 'an icon >= 192px PNG exists').toBe(true);
    for (const icon of manifest.icons!) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `icon ${icon.src} fetchable`).toBe(200);
    }
  });

  test('service worker registers and controls the page', async ({ page }) => {
    await page.goto('/');
    // `ready` resolves while the worker can still be `activating` — wait
    // for it to take control (the worker calls clients.claim()).
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const reg = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        scriptURL: registration.active?.scriptURL ?? '',
        state: registration.active?.state ?? '',
      };
    });
    expect(reg.scriptURL, 'the active worker is /sw.js').toContain('/sw.js');
    expect(reg.state, 'the worker is activated').toBe('activated');
    // controller !== null was already proven by the waitForFunction above
    // (the worker claims clients on activate).
  });

  test('offline navigation shows the offline page', async ({ page }) => {
    // Warm: let the worker install AND take control (it precaches
    // /offline and claims clients on activate).
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await page.context().setOffline(true);
    const res = await page.goto('/');
    // The service worker served the precached offline page…
    expect(res?.status(), 'offline navigation resolves via the SW').toBe(200);
    await expect(page.getByTestId('offline-title')).toHaveText('You are offline');
    await expect(page.getByTestId('offline-body')).toContainText('never served from a stale cache');

    // …and an API call while offline FAILS (never served from the worker).
    const apiOffline = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/health');
        return { ok: true, status: r.status };
      } catch {
        return { ok: false, status: 0 };
      }
    });
    expect(apiOffline.ok, 'API fetch offline is NOT served by the worker').toBe(false);

    await page.context().setOffline(false);
  });

  test('API responses are never cached by the worker', async ({ page }) => {
    // Drive real API traffic first so any (wrong) caching would have
    // happened: the homepage fetches prices on mount; also hit health.
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.evaluate(async () => {
      await fetch('/api/health').catch(() => {});
      await fetch('/api/version').catch(() => {});
    });
    await page.waitForTimeout(300);

    const apiCacheHits = await page.evaluate(async () => {
      const names = await caches.keys();
      const hits: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname.startsWith('/api/')) hits.push(req.url);
        }
      }
      return hits;
    });
    expect(apiCacheHits, 'no /api/ URL in any service-worker cache').toEqual([]);
  });
});

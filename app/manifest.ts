import type { MetadataRoute } from 'next';

/**
 * X3-09 (Round 15 B7): the PWA web app manifest, served at
 * /manifest.webmanifest by the Next metadata-route convention
 * (app/manifest.ts — see node_modules/next/dist/docs/…/manifest.md).
 *
 * Branding matches the terminal: dark navy (#0A0F1C) with the gold
 * accent (#D4AF37); icons were rendered as exact-size screenshots of a
 * vector source (public/icons/*). The maskable variant keeps the glyph
 * inside the adaptive-icon safe zone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rishi Terminal — Sacred Investment Intelligence',
    short_name: 'Rishi Terminal',
    description: 'AI-powered investment wisdom from 21 legendary investors',
    id: '/',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0F1C',
    theme_color: '#0A0F1C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

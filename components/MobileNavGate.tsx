'use client';

// components/MobileNavGate.tsx — Z5 (Round 13): the mobile navigation
// drawer mounts ONLY under the 900px breakpoint (the same media query that
// reveals .hamburger-btn in globals.css). HamburgerMenu previously mounted
// on EVERY page — CSS-hidden on desktop — so its chunk shipped in every
// route's first-load JS for desktop users who can never see it. With the
// gate, the chunk is fetched only when a mobile viewport actually exists.
//
// The gate itself is intentionally trivial (a matchMedia listener) so the
// always-shipped cost stays negligible. SSR renders nothing — the drawer is
// a fixed-position overlay with no first-byte content, so there is nothing
// to hydrate and no CLS surface (its desktop absence was invisible anyway).

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const HamburgerMenu = dynamic(
  () => import('./HamburgerMenu').then(m => m.HamburgerMenu),
  { ssr: false },
);

export function MobileNavGate() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile ? <HamburgerMenu /> : null;
}

// X4 (Round 11): server layout for a client-rooted page. The route's
// dictionary namespace arrives as an RSC prop (streamed flight payload)
// instead of riding the page's first-load JS — see lib/languageShell.ts
// and the homepage's note in app/page.tsx. A layout (not the page) carries
// the provider because the page is a client component and cannot import
// server-only data itself.
import type { ReactNode } from "react";
import { NamespaceProvider } from "@/components/shared/NamespaceProvider";
import { fno } from "@/messages/en.json";

import { routeMetadata } from "@/lib/seo/routeMetadata";
// R5-ADVICE-IDENTIFIERS (founder directive 2026-10-11): the F&O strategy
// legs are HIDDEN until the founder decides — fail-closed (rule 6).
import { fnoEnabled } from '@/lib/featureFlags';
import { notFound } from 'next/navigation';

export const metadata = routeMetadata({
  path: "/fno",
  title: "F&O Intelligence Suite | Rishi Terminal",
  description: "Derivatives intelligence — requires rights-cleared NSE derivatives data, currently unavailable, stated honestly.",
});

export default function FnoLayout({ children }: { children: ReactNode }) {
  if (!fnoEnabled()) notFound();

  return <NamespaceProvider ns={{ fno }}>{children}</NamespaceProvider>;
}

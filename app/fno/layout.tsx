// X4 (Round 11): server layout for a client-rooted page. The route's
// dictionary namespace arrives as an RSC prop (streamed flight payload)
// instead of riding the page's first-load JS — see lib/languageShell.ts
// and the homepage's note in app/page.tsx. A layout (not the page) carries
// the provider because the page is a client component and cannot import
// server-only data itself.
import type { ReactNode } from "react";
import { NamespaceProvider } from "@/components/shared/NamespaceProvider";
import { fno } from "@/messages/en.json";

export default function FnoLayout({ children }: { children: ReactNode }) {
  return <NamespaceProvider ns={{ fno }}>{children}</NamespaceProvider>;
}

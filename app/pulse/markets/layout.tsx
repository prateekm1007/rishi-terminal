// WP1: metadata-only server layout for the client-rooted markets page
// (the pulse NamespaceProvider keeps flowing from app/pulse/layout.tsx).
import type { ReactNode } from "react";
import { routeMetadata } from "@/lib/seo/routeMetadata";
export const metadata = routeMetadata({
  path: "/pulse/markets",
  title: "World Markets Command Center | Rishi Terminal",
  description: "World markets at a glance: indexes, currencies and commodities with regime readouts.",
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

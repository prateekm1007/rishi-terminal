// WP1: metadata-only server layout for the client-rooted sign-in page.
import type { ReactNode } from "react";
import { routeMetadata } from "@/lib/seo/routeMetadata";
export const metadata = routeMetadata({
  path: "/auth/signin",
  title: "Sign in | Rishi Terminal",
  description: "Sign in to Rishi Terminal to sync your watchlist and portfolio.",
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// WP1: metadata-only server layout (the fno NamespaceProvider keeps
// // flowing from app/fno/layout.tsx).
import type { ReactNode } from "react";
import { routeMetadata } from "@/lib/seo/routeMetadata";
export const metadata = routeMetadata({
  path: "/fno/backtester",
  title: "F&O Strategy Backtester | Rishi Terminal",
  description: "Derivatives strategy backtesting — requires rights-cleared NSE derivatives data, currently unavailable.",
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

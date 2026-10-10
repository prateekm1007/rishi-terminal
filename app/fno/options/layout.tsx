// WP1: metadata-only server layout (the fno NamespaceProvider keeps
// // flowing from app/fno/layout.tsx).
import type { ReactNode } from "react";
import { routeMetadata } from "@/lib/seo/routeMetadata";
export const metadata = routeMetadata({
  path: "/fno/options",
  title: "Options Chain | Rishi Terminal",
  description: "Options chain — requires rights-cleared NSE derivatives data, currently unavailable.",
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

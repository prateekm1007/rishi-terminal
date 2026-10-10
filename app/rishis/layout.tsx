import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/rishis",
  title: "Chat with Rishis — AI simulation | Rishi Terminal",
  description: "Chat with AI simulations of 20 legendary investors about any stock in the universe.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}

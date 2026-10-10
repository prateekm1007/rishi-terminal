#!/usr/bin/env python3
# WP1 layout metadata — client pages cannot export metadata (Next.js 16),
# so their per-route metadata lives in the segment layout. This script:
#   1. replaces the title/description/canonical blocks in the 8 existing
#      layouts with the shared routeMetadata form (same public copy);
#   2. adds the missing metadata export to the alerts + fno layouts;
#   3. creates metadata-only layouts for pulse/markets, fno/backtester,
#      fno/options and auth/signin (their parents keep providing the
#      NamespaceProvider — layouts nest).
import re
from pathlib import Path

ROOT = Path("/home/z/rishi-terminal")
HELPER_IMPORT = 'import { routeMetadata } from "@/lib/seo/routeMetadata";\n'

META_BLOCKS = {
    "app/news/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/news",\n  title: "Market Intelligence — live news | Rishi Terminal",\n  description: "Latest India and global market headlines with region and category filters.",\n});',
    "app/pulse/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/pulse",\n  title: "Market Pulse — India macro dashboard | Rishi Terminal",\n  description: "CPI, WPI, repo rate, G-Sec yields, GDP and money supply with regime analysis. Macro data is reference-labelled with per-row as-of dates.",\n});',
    "app/rishis/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/rishis",\n  title: "Chat with Rishis — AI simulation | Rishi Terminal",\n  description: "Chat with AI simulations of 20 legendary investors about any stock in the universe.",\n});',
    "app/forex/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/forex",\n  title: "Forex — USD/INR, majors and crosses | Rishi Terminal",\n  description: "USD/INR spot, major pairs and crosses with per-row provenance chips and as-of times.",\n});',
    "app/bonds/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/bonds",\n  title: "Bonds — G-Secs, SDLs, corporates, US Treasuries | Rishi Terminal",\n  description: "Sovereign and corporate debt yields, labelled live where a live quote exists.",\n});',
    "app/commodities/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/commodities",\n  title: "Commodities — gold, silver, crude, base metals | Rishi Terminal",\n  description: "Precious metals, energy and base metals with per-row provenance chips and as-of times.",\n});',
    "app/crypto/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/crypto",\n  title: "Crypto Markets — BTC, ETH and top assets | Rishi Terminal",\n  description: "Live crypto quotes and static reference analytics, labelled per field.",\n});',
    "app/pricing/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/pricing",\n  title: "Pricing — Everything is free | Rishi Terminal",\n  description: "Every feature on Rishi Terminal is free: all Rishis, AI chat, the screener, portfolio tools.",\n});',
    "app/alerts/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/alerts",\n  title: "Price Alerts | Rishi Terminal",\n  description: "Set price alerts on universe stocks.",\n});',
    "app/fno/layout.tsx": 'export const metadata = routeMetadata({\n  path: "/fno",\n  title: "F&O Intelligence Suite | Rishi Terminal",\n  description: "Derivatives intelligence — requires rights-cleared NSE derivatives data, currently unavailable, stated honestly.",\n});',
}

REPLACE_PAT = re.compile(r"export const metadata(?:: Metadata)? = \{[\s\S]*?\n\};")

NEW_LAYOUTS = {
    "app/pulse/markets/layout.tsx": (
        'export const metadata = routeMetadata({\n  path: "/pulse/markets",\n  title: "World Markets Command Center | Rishi Terminal",\n  description: "World markets at a glance: indexes, currencies and commodities with regime readouts.",\n});',
        "WP1: metadata-only server layout for the client-rooted markets page\n// (the pulse NamespaceProvider keeps flowing from app/pulse/layout.tsx).",
    ),
    "app/fno/backtester/layout.tsx": (
        'export const metadata = routeMetadata({\n  path: "/fno/backtester",\n  title: "F&O Strategy Backtester | Rishi Terminal",\n  description: "Derivatives strategy backtesting — requires rights-cleared NSE derivatives data, currently unavailable.",\n});',
        "WP1: metadata-only server layout (the fno NamespaceProvider keeps\n// flowing from app/fno/layout.tsx).",
    ),
    "app/fno/options/layout.tsx": (
        'export const metadata = routeMetadata({\n  path: "/fno/options",\n  title: "Options Chain | Rishi Terminal",\n  description: "Options chain — requires rights-cleared NSE derivatives data, currently unavailable.",\n});',
        "WP1: metadata-only server layout (the fno NamespaceProvider keeps\n// flowing from app/fno/layout.tsx).",
    ),
    "app/auth/signin/layout.tsx": (
        'export const metadata = routeMetadata({\n  path: "/auth/signin",\n  title: "Sign in | Rishi Terminal",\n  description: "Sign in to Rishi Terminal to sync your watchlist and portfolio.",\n});',
        "WP1: metadata-only server layout for the client-rooted sign-in page.",
    ),
}

LAYOUT_TMPL = """{comment}
import type {{ ReactNode }} from "react";
{helper}{meta}

export default function RouteLayout({{ children }}: {{ children: ReactNode }}) {{
  return <>{{children}}</>;
}}
"""


def fix_layout(rel: str, block: str):
    p = ROOT / rel
    src = p.read_text()
    if "routeMetadata" in src:
        print(f"  == {rel}: already uses routeMetadata — skipped")
        return
    if not REPLACE_PAT.search(src):
        print(f"  !! {rel}: no metadata block — adding one")
        # insert before the first `export default function`
        m = re.search(r"export default function", src)
        if not m:
            print(f"  !! {rel}: no default export — skipped")
            return
        add = HELPER_IMPORT + block + "\n\n"
        src = src[: m.start()] + add + src[m.start() :]
    else:
        src = REPLACE_PAT.sub(block.rstrip("\n"), src, count=1)
        if HELPER_IMPORT.strip() not in src:
            lines = src.split("\n")
            last = max(i for i, l in enumerate(lines[:30]) if l.startswith("import ") or l.startswith("} from"))
            lines.insert(last + 1, HELPER_IMPORT.rstrip("\n"))
            src = "\n".join(lines)
    p.write_text(src)
    print(f"  ok {rel}")


def new_layout(rel: str, block: str, comment: str):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    content = LAYOUT_TMPL.format(
        comment="\n".join("// " + line for line in comment.split("\n")),
        helper=HELPER_IMPORT,
        meta=block,
    )
    p.write_text(content)
    print(f"  new {rel}")


if __name__ == "__main__":
    for rel, block in META_BLOCKS.items():
        fix_layout(rel, block)
    for rel, (block, comment) in NEW_LAYOUTS.items():
        new_layout(rel, block, comment)
    print("done")

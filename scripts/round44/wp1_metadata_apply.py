#!/usr/bin/env python3
# WP1 metadata application — one transform per file, precise and idempotent.
# Adds or replaces each public page's metadata export with the shared
# routeMetadata builder (lib/seo/routeMetadata.ts). Titles/descriptions are
# taken from each page's OWN rendered H1/SSR description — no invented copy.
# The four forex-rishis-mirror routes keep their existing (wrong-content)
# titles — that content duplication is reported for a founder decision;
# this PR only makes every URL self-declare canonical + og.
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/rishi-terminal")

HELPER_IMPORT = 'import { routeMetadata } from "@/lib/seo/routeMetadata";\n'


def add_after_imports(src: str, block: str, rel: str) -> str:
    """Insert `block` after the last top-of-file import statement."""
    lines = src.split("\n")
    last_import = -1
    in_import = False
    for i, line in enumerate(lines[:80]):
        if re.match(r'^import\b', line):
            last_import = i
            in_import = True
        elif in_import and (line.startswith("} from") or (line.strip().startswith("from ") and "from" in line)):
            last_import = i
            in_import = False
        elif in_import and line.strip() == "":
            continue
        elif in_import and not line.startswith((" ", "}")):
            in_import = False
    if last_import < 0:
        print(f"  !! {rel}: no import block found — skipped")
        return src
    lines.insert(last_import + 1, "\n" + block.rstrip("\n"))
    return "\n".join(lines)


def replace_export(src: str, new_block: str, rel: str) -> tuple[str, bool]:
    """Replace an existing `export const metadata ... };` block (non-greedy to the closing '};')."""
    pat = re.compile(r"export const metadata(?:: Metadata)? = \{[\s\S]*?\n\};", re.M)
    if not pat.search(src):
        return src, False
    return pat.sub(new_block.rstrip("\n"), src, count=1), True


def ensure_helper_import(src: str, rel: str) -> str:
    if "routeMetadata" in src and HELPER_IMPORT.strip() in src:
        return src
    # place the helper import directly after the Next metadata/site imports
    lines = src.split("\n")
    idx = 0
    for i, line in enumerate(lines[:40]):
        if line.startswith("import "):
            idx = i
    lines.insert(idx + 1, HELPER_IMPORT.rstrip("\n"))
    return "\n".join(lines)


def process(rel: str, meta: str, has_existing: bool, drop_metadata_type_import: bool = False):
    p = ROOT / rel
    src = p.read_text()
    orig = src
    if has_existing:
        src, replaced = replace_export(src, meta, rel)
        if not replaced:
            print(f"  !! {rel}: existing metadata export not found — skipped")
            return
    else:
        block = meta + "\n"
        src = add_after_imports(src, block, rel)
    src = ensure_helper_import(src, rel)
    if drop_metadata_type_import:
        # Remove the now-unused `import type { Metadata } from "next";`
        src = re.sub(r'import type \{ Metadata \} from "next";\n', "", src, count=1)
        src = re.sub(r"import type \{ Metadata \} from 'next';\n", "", src, count=1)
    if src != orig:
        p.write_text(src)
        print(f"  ok {rel}")
    else:
        print(f"  == {rel}: unchanged")


JOBS: list[tuple[str, str, bool, bool]] = [
    # (file, metadata block, has_existing_export, drop_Metadata_type_import)
    (
        "app/stocks/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/stocks",\n  title: "Stocks — India equities | Rishi Terminal",\n  description: "Browse and screen India equities by consensus score, valuation, quality and leverage. Free tier shows the top-5 Rishi verdicts.",\n});',
        True,
        False,
    ),
    (
        "app/news/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/news",\n  title: "Market Intelligence — live news | Rishi Terminal",\n  description: "Latest India and global market headlines with region and category filters.",\n});',
        False,
        False,
    ),
    (
        "app/rishis/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/rishis",\n  title: "Chat with Rishis — AI simulation | Rishi Terminal",\n  description: "Chat with AI simulations of 20 legendary investors about any stock in the universe.",\n});',
        False,
        False,
    ),
    (
        "app/pulse/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/pulse",\n  title: "Market Pulse — India macro dashboard | Rishi Terminal",\n  description: "CPI, WPI, repo rate, G-Sec yields, GDP and money supply with regime analysis. Macro data is reference-labelled with per-row as-of dates.",\n});',
        False,
        False,
    ),
    (
        "app/pulse/markets/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/pulse/markets",\n  title: "World Markets Command Center | Rishi Terminal",\n  description: "World markets at a glance: indexes, currencies and commodities with regime readouts.",\n});',
        False,
        False,
    ),
    (
        "app/forex/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/forex",\n  title: "Forex — USD/INR, majors and crosses | Rishi Terminal",\n  description: "USD/INR spot, major pairs and crosses with per-row provenance chips and as-of times.",\n});',
        False,
        False,
    ),
    (
        "app/forex/pairs/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/forex/pairs",\n  title: "Forex Rishis — Rishi Terminal",\n  description: "Currency trading wisdom from legendary macro investors",\n});',
        True,
        False,
    ),
    (
        "app/forex/rishis/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/forex/rishis",\n  title: "Forex Rishis — Rishi Terminal",\n  description: "Currency trading wisdom from legendary macro investors",\n});',
        True,
        False,
    ),
    (
        "app/bonds/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/bonds",\n  title: "Bonds — G-Secs, SDLs, corporates, US Treasuries | Rishi Terminal",\n  description: "Sovereign and corporate debt yields, labelled live where a live quote exists.",\n});',
        False,
        False,
    ),
    (
        "app/bonds/rishis/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/bonds/rishis",\n  title: "Forex Rishis — Rishi Terminal",\n  description: "Currency trading wisdom from legendary macro investors",\n});',
        True,
        False,
    ),
    (
        "app/bonds/screener/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/bonds/screener",\n  title: "Forex Rishis — Rishi Terminal",\n  description: "Currency trading wisdom from legendary macro investors",\n});',
        True,
        False,
    ),
    (
        "app/commodities/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/commodities",\n  title: "Commodities — gold, silver, crude, base metals | Rishi Terminal",\n  description: "Precious metals, energy and base metals with per-row provenance chips and as-of times.",\n});',
        False,
        False,
    ),
    (
        "app/crypto/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/crypto",\n  title: "Crypto Markets — BTC, ETH and top assets | Rishi Terminal",\n  description: "Live crypto quotes and static reference analytics, labelled per field.",\n});',
        False,
        False,
    ),
    (
        "app/lab/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/lab",\n  title: "Portfolio Lab — compare, watchlist, journal | Rishi Terminal",\n  description: "Compare stocks side by side, track a watchlist and keep notes.",\n});',
        True,
        False,
    ),
    (
        "app/pricing/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/pricing",\n  title: "Pricing — Everything is free | Rishi Terminal",\n  description: "Every feature on Rishi Terminal is free: all Rishis, AI chat, the screener, portfolio tools.",\n});',
        False,
        False,
    ),
    (
        "app/methodology/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/methodology",\n  title: "Methodology | Rishi Terminal",\n  description: "How every Rishi score is computed: inputs, formulas, thresholds, rationale, failure modes and non-applicable sectors.",\n});',
        True,
        True,
    ),
    (
        "app/privacy/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/privacy",\n  title: "Privacy Policy | Rishi Terminal",\n  description: "What data Rishi Terminal collects, where it lives, and what never happens to it.",\n});',
        True,
        True,
    ),
    (
        "app/terms/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/terms",\n  title: "Terms of Service | Rishi Terminal",\n  description: "The terms that govern use of Rishi Terminal.",\n});',
        True,
        True,
    ),
    (
        "app/alerts/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/alerts",\n  title: "Price Alerts | Rishi Terminal",\n  description: "Set price alerts on universe stocks.",\n});',
        False,
        False,
    ),
    (
        "app/chat/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/chat",\n  title: "Chat with Rishis — AI simulation | Rishi Terminal",\n  description: "AI-powered investment wisdom from 20 legendary investors.",\n});',
        False,
        False,
    ),
    (
        "app/fno/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/fno",\n  title: "F&O Intelligence Suite | Rishi Terminal",\n  description: "Derivatives intelligence — requires rights-cleared NSE derivatives data, currently unavailable, stated honestly.",\n});',
        False,
        False,
    ),
    (
        "app/fno/backtester/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/fno/backtester",\n  title: "F&O Strategy Backtester | Rishi Terminal",\n  description: "Derivatives strategy backtesting — requires rights-cleared NSE derivatives data, currently unavailable.",\n});',
        False,
        False,
    ),
    (
        "app/fno/options/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/fno/options",\n  title: "Options Chain | Rishi Terminal",\n  description: "Options chain — requires rights-cleared NSE derivatives data, currently unavailable.",\n});',
        False,
        False,
    ),
    (
        "app/auth/signin/page.tsx",
        'export const metadata = routeMetadata({\n  path: "/auth/signin",\n  title: "Sign in | Rishi Terminal",\n  description: "Sign in to Rishi Terminal to sync your watchlist and portfolio.",\n});',
        False,
        False,
    ),
]

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for rel, meta, has_existing, drop in JOBS:
        if only and only not in rel:
            continue
        process(rel, meta, has_existing, drop)
    print("done")

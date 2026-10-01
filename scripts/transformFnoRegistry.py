"""
G9 mechanical transform (audit 2026-10-02): rewrite lib/fno/rishiPrompts.ts
so its roster is DERIVED from the canonical persona registry — the F&O
file keeps only F&O-specific content (style, fnoStyle, prompt builders),
keyed by canonical persona id. One authored copy per field class:
  display fields + tiers  -> lib/chat/registry.ts (fnoAccess axis)
  F&O style/prompts       -> lib/fno/rishiPrompts.ts (this rewrite)
Run: python3 scripts/transformFnoRegistry.py
"""
import re

SRC = "lib/fno/rishiPrompts.ts"

src = open(SRC).read()

# 1. locate the roster array block
start = src.index("export const RISHI_PERSONALITIES: RishiPersonality[] = [")
end = src.index("\n];", start)
block = src[start:end]

# 2. split entries on top-level "  {\n"
entries = re.split(r"\n  \{\n", block)[1:]
assert len(entries) == 7, f"expected 7 F&O personas, got {len(entries)}"

out_entries = []
for e in entries:
    pid = re.search(r'id:\s*"([^"]+)"', e).group(1)
    style = re.search(r'style:\s*"([^"]*)"', e).group(1)
    fnostyle = re.search(r'fnoStyle:\s*"([^"]*)"', e).group(1)
    sp_start = e.index("systemPrompt:")
    sp_body = e[sp_start : e.rindex("`") + 1]  # cut at the LAST backtick
    assert sp_body.endswith("`"), (pid, sp_body[-40:])
    out_entries.append((pid, style, fnostyle, sp_body))

# 3. reassemble the file: header + interfaces + helper + keyed map + derivation
head_end = src.index("// ── Rishi Personalities")
head = src[:head_end]
lookup_start = src.index("// ── Lookup")
lookup = src[lookup_start:]

derived_map = ",\n".join(
    f'  "{pid}": {{\n    style: "{style}",\n    fnoStyle: "{fnostyle}",\n    {sp_body}\n  }}'
    for pid, style, fnostyle, sp_body in out_entries
)

new_mid = f'''// ── F&O-specific content, keyed by CANONICAL persona id (G9) ──────────────
// The roster itself (id/name/fullName/emoji/color/origin/tier) is DERIVED
// from the canonical registry below — this map holds ONLY what is genuinely
// F&O-specific: the strategy style metadata and the F&O prompt builders.

const FNO_DERIVED: Record<
  string,
  {{ style: string; fnoStyle: string; systemPrompt: (ctx: FnOContext) => string }}
> = {{
{derived_map}
}};

// ── Derived roster (the ONE persona authority is lib/chat/registry.ts) ────
// fnoAccess on the canonical persona is the F&O entitlement axis, carried
// over VERBATIM from the pre-merge roster (pinned by test/fno.registry.test
// .ts). A canonical persona without F&O content or without an F&O tier is
// simply not part of the F&O suite — no second persona DB exists.

export const RISHI_PERSONALITIES: RishiPersonality[] = CANONICAL_PERSONAS.flatMap(p => {{
  const d = FNO_DERIVED[p.id];
  if (!d || !p.fnoAccess) return [];
  return [{{
    id: p.id,
    name: p.name,
    fullName: p.fullName,
    emoji: p.emoji,
    origin: (p.origin === "Global" ? "Global" : "India") as "India" | "Global",
    style: d.style,
    fnoStyle: d.fnoStyle,
    tier: p.fnoAccess,
    color: p.color,
    systemPrompt: d.systemPrompt,
  }}];
}});
'''

new_src = (
    head.replace(
        "// ============================================================",
        "// DERIVED F&O persona surface (G9, audit 2026-10-02): the roster is\n"
        "// derived from lib/chat/registry.ts — the ONE canonical persona\n"
        "// authority. This file keeps only F&O-specific metadata + prompt\n"
        "// builders, keyed by canonical persona id. The F&O entitlement axis\n"
        "// (fnoAccess) lives on the canonical personas, carried over verbatim\n"
        "// from the roster this file used to duplicate (Rule 14 closure).\n"
        "// ============================================================",
        1,
    )
    + new_mid
    + lookup
)

# import the registry after the header banner
new_src = new_src.replace(
    "// ============================================================\n\n",
    "// ============================================================\n\nimport { CANONICAL_PERSONAS } from \"@/lib/chat/registry\";\n\n",
    1,
)

open(SRC, "w").write(new_src)
print(f"rewritten: {len(out_entries)} F&O personas now derive from the canonical registry")

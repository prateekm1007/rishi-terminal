import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * N1 (round 3) local rule — no-server-only-imports-in-client.
 *
 * Second line of defence (the first is `import 'server-only'` failing the
 * Next.js build; the third is test/clientBoundary.test.ts walking the
 * transitive runtime graph). A 'use client' file must not import:
 *   - anything under lib/consensus, lib/scorers, lib/scoring
 *     (except the pure-type modules lib/<tree>/types — `import type` is legal
 *     and carries zero runtime bytes),
 *   - data/stocks (the seed dataset; data/stocks/seedMeta and
 *     data/stocks/master-list are public),
 *   - the 'server-only' package itself.
 * Client components receive results, not engines: the slim index via RSC
 * props, per-stock records via RSC props or GET /api/stock/[symbol], and
 * per-Rishi verdicts via the tier-gated GET /api/rishis/[symbol].
 */
const noServerOnlyImportsInClient = {
  meta: {
    type: "problem",
    docs: {
      description:
        "forbid server-only scoring/seed imports in 'use client' modules (N1)",
    },
    schema: [],
    messages: {
      banned:
        "'{{spec}}' is a server-only module ({{mod}}). Client components receive results, not engines — use the slim index via RSC props, /api/stock/[symbol], or /api/rishis/[symbol] (N1).",
      sideEffect:
        "a 'use client' file cannot import 'server-only' — that marker is for server modules (N1).",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/(^|[\\/])(app|components|hooks)[\\/]/.test(filename)) return {};
    const source = context.sourceCode.text;
    const head = source.split("\n").slice(0, 5).join("\n");
    if (!/^\s*['"]use client['"]/m.test(head)) return {};

    const isBannedRel = (rel) => {
      // Bare directory specs (e.g. '@/lib/scoring') resolve to index.ts —
      // normalize both forms before matching.
      const r = rel.replace(/\.(ts|tsx)$/, "").replace(/\/index$/, "");
      if (
        r === "lib/consensus" ||
        r === "lib/scorers" ||
        r === "lib/scoring" ||
        r.startsWith("lib/consensus/") ||
        r.startsWith("lib/scorers/") ||
        r.startsWith("lib/scoring/")
      ) {
        return r !== "lib/consensus/types" && r !== "lib/scorers/types";
      }
      return r === "data/stocks";
    };

    const check = (node, spec) => {
      if (spec === "server-only") {
        context.report({ node, messageId: "sideEffect" });
        return;
      }
      let rel = null;
      if (spec.startsWith("@/")) rel = spec.slice(2);
      else if (spec.startsWith("./") || spec.startsWith("../")) {
        rel = path
          .relative(REPO_ROOT, path.resolve(path.dirname(filename), spec))
          .split(path.sep)
          .join("/");
      } else return; // external package
      if (rel && isBannedRel(rel)) {
        context.report({ node, messageId: "banned", data: { spec, mod: rel } });
      }
    };

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") return; // erased at compile time
        check(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal" && typeof node.source.value === "string") {
          check(node, node.source.value);
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // N1 (round 3): local plugin carrying the client-boundary rule above.
    plugins: {
      "rishi-terminal": { rules: { "no-server-only-imports-in-client": noServerOnlyImportsInClient } },
    },
    rules: {
      "rishi-terminal/no-server-only-imports-in-client": "error",
    },
  },
  {
    // R4 (round 2): the T18 downgrade of no-explicit-any to WARN was a
    // rule weakening that hid new `any` from CI. Restored per directory:
    // cleared paths are at ZERO `any` with the rule back at ERROR — a new
    // `any` in them fails the build.
    // Directories still at WARN (not yet cleared, ratchet-tracked):
    //   app/** (non-api), components/**, lib/** (beyond
    //   auth/payments/scoring/chat), test/**, data/**.
    // N9 (round 3) cleared: hooks/**, scripts/** (now in the ERROR block).
    // Clearing a directory means fixing its sites and moving its glob
    // into the ERROR block below — never by editing the ratchet baseline.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // R4 (round 2) + N9 (round 3): cleared directories — no-explicit-any
    // is an ERROR here. hooks/** and scripts/** were cleared to zero
    // `any` in N9 (typed caches, typed snapshot rows, unknown-narrowing
    // guards); a new `any` in them now fails the build.
    files: [
      "app/api/**/*.ts",
      "lib/auth/**/*.ts",
      "lib/scoring/**/*.ts",
      "lib/chat/**/*.ts",
      "hooks/**/*.ts",
      "scripts/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Remediation T10.4: lib/scoring is the only public scoring surface.
    // Direct imports of the consensus engine or the (demoted) QVPS engine are
    // restricted to lib/scoring/** (and lib/consensus internal use).
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/consensus/engine", "**/lib/consensus/engine.ts"],
              message:
                "Score via lib/scoring (getStockScore / resolveStockScore). The consensus engine is an internal module (T10).",
            },
            {
              group: ["**/lib/scorers/rishiScoreV2", "**/lib/scorers/rishiScoreV2.ts"],
              message:
                "The QVPS engine must be imported through lib/scoring (getQvps / calculateQvps re-export). Never present it as the 'Rishi Score' (T10).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

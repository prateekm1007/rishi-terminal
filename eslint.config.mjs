import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Remediation T18 triage (documented, ratchet-enforced — see
    // scripts/eslintRatchet.mjs and eslint-ratchet.json):
    // - no-explicit-any: 235 pre-existing sites across scripts/adapters.
    //   Downgraded to WARN (not disabled) so the count is still visible and
    //   ratcheted; new `any` usage must not grow the baseline.
    // - react-hooks/purity + set-state-in-effect: React Compiler lint (v6).
    //   The flagged sites call Date.now()/setState inside event handlers and
    //   mount-sync effects — pre-existing patterns, not render-time bugs.
    //   Downgraded to WARN until the refactor lands; still ratcheted.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
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

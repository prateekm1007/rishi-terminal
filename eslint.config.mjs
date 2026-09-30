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
    // R4 (round 2): the T18 downgrade of no-explicit-any to WARN was a
    // rule weakening that hid new `any` from CI. Restored per directory:
    // the security/scoring paths below are cleared to ZERO `any` and the
    // rule is back to ERROR there — a new `any` in them fails the build.
    // Directories still at WARN (not yet cleared, ratchet-tracked):
    //   app/** (non-api), components/**, hooks/**, lib/** (beyond
    //   auth/payments/scoring/chat), scripts/**, test/**, data/**.
    // Clearing a directory means fixing its sites and moving its glob
    // into the ERROR block below — never by editing the ratchet baseline.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // R4: cleared directories — no-explicit-any is an ERROR here.
    files: [
      "app/api/**/*.ts",
      "lib/auth/**/*.ts",
      "lib/payments/**/*.ts",
      "lib/scoring/**/*.ts",
      "lib/chat/**/*.ts",
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

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

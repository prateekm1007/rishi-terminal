import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CNN Money inspired palette
        brand: {
          red: "#cc0000",
          darkred: "#990000",
          black: "#0a0a0a",
          charcoal: "#1a1a1a",
          slate: "#2a2a2a",
        },
      },
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
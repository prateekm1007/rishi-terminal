// RISHI TERMINAL - DESIGN TOKENS
export const colors = {
  bgVoid:       "#050810",
  bgPrimary:    "#0A0F1C",
  bgSurface:    "#111827",
  bgElevated:   "#1F2937",
  gold:         "#D4AF37",
  goldLight:    "#E8CB6A",
  goldDark:     "#A88B20",
  goldGlow:     "rgba(212, 175, 55, 0.25)",
  goldSubtle:   "rgba(212, 175, 55, 0.06)",
  goldBorder:   "rgba(212, 175, 55, 0.2)",
  goldBorderActive: "rgba(212, 175, 55, 0.5)",
  purple:       "#8B5CF6",
  purpleLight:  "#A78BFA",
  purpleGlow:   "rgba(139, 92, 246, 0.25)",
  green:        "#22C55E",
  greenDark:    "#16A34A",
  greenGlow:    "rgba(34, 197, 94, 0.2)",
  red:          "#EF4444",
  redDark:      "#DC2626",
  redGlow:      "rgba(239, 68, 68, 0.2)",
  amber:        "#F59E0B",
  textPrimary:   "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted:     "#475569",
  textGhost:     "#334155",
  border:        "#1E293B",
  borderSubtle:  "rgba(51, 65, 85, 0.5)",
} as const;

export const shadows = {
  sm:     "0 4px 16px -4px rgba(0, 0, 0, 0.4)",
  md:     "0 10px 30px -10px rgba(0, 0, 0, 0.6)",
  lg:     "0 20px 60px -20px rgba(0, 0, 0, 0.8)",
  gold:   "0 0 30px rgba(212, 175, 55, 0.15)",
  purple: "0 0 30px rgba(139, 92, 246, 0.15)",
  green:  "0 0 20px rgba(34, 197, 94, 0.15)",
  red:    "0 0 20px rgba(239, 68, 68, 0.15)",
} as const;

export const fonts = {
  serif: `"Cinzel", "Playfair Display", Georgia, serif`,
  sans:  `"Inter", system-ui, sans-serif`,
  mono:  `"JetBrains Mono", "Fira Code", monospace`,
} as const;

export const radii = {
  sm:   "6px",
  md:   "12px",
  lg:   "16px",
  xl:   "24px",
  full: "9999px",
} as const;

export function getScoreColors(score: number, mode: "LONG" | "SHORT") {
  if (mode === "SHORT") {
    if (score >= 85) return { primary: colors.red,    glow: colors.redGlow,    label: "Legendary Short" };
    if (score >= 75) return { primary: "#F97316",     glow: "rgba(249,115,22,0.2)", label: "High Conviction Short" };
    if (score >= 65) return { primary: colors.amber,  glow: "rgba(245,158,11,0.2)", label: "Tactical Short" };
    return { primary: colors.textMuted, glow: "transparent", label: "Dangerous Short" };
  }
  if (score >= 90) return { primary: colors.gold,    glow: colors.goldGlow,    label: "Legendary" };
  if (score >= 80) return { primary: colors.green,   glow: colors.greenGlow,   label: "High Conviction" };
  if (score >= 70) return { primary: "#4ADE80",      glow: colors.greenGlow,   label: "Strong" };
  if (score >= 60) return { primary: colors.amber,   glow: "rgba(245,158,11,0.2)", label: "Watchlist" };
  if (score >= 50) return { primary: colors.textSecondary, glow: "transparent", label: "Neutral" };
  return { primary: colors.red, glow: colors.redGlow, label: "Avoid" };
}

export const gradients = {
  gold:      "linear-gradient(135deg, #A88B20 0%, #D4AF37 40%, #E8CB6A 100%)",
  sacred:    "linear-gradient(135deg, #D4AF37 0%, #8B5CF6 100%)",
  surface:   "linear-gradient(135deg, rgba(31,41,55,0.9) 0%, rgba(17,24,39,0.95) 100%)",
  long:      "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  short:     "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
  greenGlow: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, transparent 100%)",
  redGlow:   "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, transparent 100%)",
  goldGlow:  "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, transparent 100%)",
  dark:      "linear-gradient(160deg, #050810 0%, #0A0F1C 50%, #0D1220 100%)",
} as const;

export const cardStyles = {
  base: {
    background:   "#111827",
    border:       "1px solid #1E293B",
    borderRadius: "16px",
    padding:      "24px",
  },
  glass: {
    background:       "rgba(17, 24, 39, 0.7)",
    backdropFilter:   "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border:           "1px solid rgba(212, 175, 55, 0.15)",
    borderRadius:     "16px",
    boxShadow:        "0 10px 30px -10px rgba(0,0,0,0.6)",
  },
  sacred: {
    background:   "linear-gradient(135deg, rgba(31,41,55,0.9) 0%, rgba(17,24,39,0.95) 100%)",
    border:       "1px solid rgba(212, 175, 55, 0.2)",
    borderRadius: "24px",
    boxShadow:    "0 10px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.08)",
  },
  stat: {
    background:   "#111827",
    border:       "1px solid #1E293B",
    borderRadius: "16px",
    padding:      "20px",
  },
} as const;
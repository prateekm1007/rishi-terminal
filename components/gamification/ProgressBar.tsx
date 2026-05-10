"use client";

import { useEffect, useState } from "react";
import { loadProgress, getLevelFromXP, getXPForNextLevel, EnlightenmentLevel } from "@/lib/gamification";

const LEVEL_COLORS: Record<EnlightenmentLevel, string> = {
  Seeker:       "#64748B",
  Apprentice:   "#F59E0B",
  Practitioner: "#06B6D4",
  Rishi:        "#D4AF37",
  Maharishi:    "#8B5CF6",
};

const LEVEL_EMOJI: Record<EnlightenmentLevel, string> = {
  Seeker:       "🔍",
  Apprentice:   "📚",
  Practitioner: "⚡",
  Rishi:        "🧘",
  Maharishi:    "🌟",
};

export default function ProgressBar() {
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState<EnlightenmentLevel>("Seeker");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const progress = loadProgress();
    setXP(progress.xp);
    setLevel(progress.level);
    setStreak(progress.streak);
  }, []);

  const nextLevelXP = getXPForNextLevel(xp);
  const currentLevelStart = level === "Seeker" ? 0 : level === "Apprentice" ? 1000 : level === "Practitioner" ? 3000 : level === "Rishi" ? 7000 : 15000;
  const progress = ((xp - currentLevelStart) / (nextLevelXP - currentLevelStart)) * 100;

  const levelColor = LEVEL_COLORS[level];
  const levelEmoji = LEVEL_EMOJI[level];

  return (
    <div style={{
      background: "rgba(17,24,39,0.8)", border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: "14px", padding: "14px 18px",
      display: "flex", alignItems: "center", gap: "16px",
    }}>
      {/* Level Badge */}
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px",
        background: levelColor + "18", border: "1px solid " + levelColor + "40",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", flexShrink: 0,
      }}>
        {levelEmoji}
      </div>

      {/* Progress Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: levelColor }}>{level}</span>
          <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>
            {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          </span>
        </div>
        <div style={{ height: "6px", background: "rgba(51,65,85,0.5)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: Math.min(100, progress) + "%",
            background: `linear-gradient(90deg, ${levelColor}, ${levelColor}99)`,
            borderRadius: "3px", transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div style={{
          padding: "6px 12px", borderRadius: "10px",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
        }}>
          <span style={{ fontSize: "16px" }}>🔥</span>
          <div>
            <div style={{ fontSize: "10px", color: "#64748B" }}>Streak</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#EF4444", fontFamily: "JetBrains Mono, monospace" }}>
              {streak}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
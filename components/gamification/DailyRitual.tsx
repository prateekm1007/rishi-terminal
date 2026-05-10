"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateDailyRitual, loadProgress, saveProgress, awardXP, DailyRitual } from "@/lib/gamification";

export default function DailyRitualWidget() {
  const [ritual, setRitual] = useState<DailyRitual | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const r = generateDailyRitual(today);
    setRitual(r);

    const progress = loadProgress();
    const lastCompleted = localStorage.getItem("last_ritual_completed");
    setCompleted(lastCompleted === today);
  }, []);

  const markComplete = () => {
    const today = new Date().toDateString();
    localStorage.setItem("last_ritual_completed", today);
    awardXP(50);
    setCompleted(true);
  };

  if (!ritual) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(17,24,39,0.95))",
      border: "1px solid rgba(212,175,55,0.25)",
      borderRadius: "20px", padding: "24px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.12em", marginBottom: "4px" }}>
            ☀️ DAILY RISHI RITUAL
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        {completed ? (
          <div style={{
            padding: "8px 16px", borderRadius: "10px",
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
            color: "#22C55E", fontSize: "12px", fontWeight: 700,
          }}>
            ✓ Completed (+50 XP)
          </div>
        ) : (
          <button
            onClick={markComplete}
            style={{
              padding: "8px 16px", borderRadius: "10px",
              background: "linear-gradient(135deg,#A88B20,#D4AF37)",
              border: "none", color: "#0A0F1C", fontSize: "12px",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Mark Complete
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Long Pick */}
        <Link href={`/stock/${ritual.longPick.symbol}`} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
            borderLeft: "3px solid #22C55E", borderRadius: "0 10px 10px 0",
            padding: "14px 16px", cursor: "pointer", transition: "all 0.15s ease",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "5px"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "3px"}
          >
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#22C55E", letterSpacing: "0.1em", marginBottom: "6px" }}>
              🟢 LONG PICK
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace", marginBottom: "4px" }}>
              {ritual.longPick.symbol}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.6 }}>
              {ritual.longPick.reason}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#22C55E", marginTop: "8px" }}>
              Score: {ritual.longPick.score}/100
            </div>
          </div>
        </Link>

        {/* Short Pick */}
        <Link href={`/stock/${ritual.shortPick.symbol}`} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderLeft: "3px solid #EF4444", borderRadius: "0 10px 10px 0",
            padding: "14px 16px", cursor: "pointer", transition: "all 0.15s ease",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "5px"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "3px"}
          >
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#EF4444", letterSpacing: "0.1em", marginBottom: "6px" }}>
              🔴 SHORT PICK
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace", marginBottom: "4px" }}>
              {ritual.shortPick.symbol}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.6 }}>
              {ritual.shortPick.reason}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#EF4444", marginTop: "8px" }}>
              Short Score: {ritual.shortPick.score}/100
            </div>
          </div>
        </Link>
      </div>

      {/* Wisdom */}
      <div style={{
        background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)",
        borderLeft: "3px solid #D4AF37", borderRadius: "0 10px 10px 0",
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", marginBottom: "8px" }}>
          🧘 TODAY'S WISDOM
        </div>
        <div style={{ fontSize: "13px", color: "#E2E8F0", fontStyle: "italic", lineHeight: 1.8, marginBottom: "8px", fontFamily: "Playfair Display, Georgia, serif" }}>
          "{ritual.wisdom.quote}"
        </div>
        <div style={{ fontSize: "11px", color: "#64748B", textAlign: "right" }}>
          — {ritual.wisdom.author}
        </div>
      </div>
    </div>
  );
}
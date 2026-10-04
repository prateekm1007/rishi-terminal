'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Stock, RishiScore } from '../../lib/types';
// A1 (Round 14): the parallel is resolved on the SERVER (lib/wisdom/
// historicalParallels — the dataset no longer ships in the client bundle)
// and arrives as a prop.
import type { HistoricalParallel } from '../../lib/wisdom/historicalParallels';

interface WisdomSidebarProps {
  stock: Stock;
  scores: RishiScore[];
  /** A1: server-resolved historical parallel for this stock (null = the
   *  honest "no parallels detected" state). Computed at regeneration. */
  parallel: HistoricalParallel | null;
}

// Z5 (Round 13): the chat pane loads on the first Chat-tab activation —
// interactive-only, ssr:false costs nothing visible and keeps every stock
// page's first-load JS free of the chat client (message state, /api/chat
// wiring, provenance renderer).
const WisdomChat = dynamic(() => import('./WisdomChat').then(m => m.WisdomChat), { ssr: false });

// RISHI SYSTEM PROMPTS - Same as in /rishis page


export function WisdomSidebar({ stock, scores, parallel }: WisdomSidebarProps) {
  // Z5 (Round 13): the fundamentals overlay block is DELETED — its only
  // consumer was the pre-T7 client-side prompt assembly, which moved to
  // the server in remediation T7. The sidebar kept fetching
  // /api/fundamentals per stock page for values nothing read (a live
  // runtime cost on every page view, now gone).
  const [activeMode, setActiveMode] = useState<"wisdom" | "chat">("wisdom");
  // A1: `parallel` arrives from the server (page.tsx runs the detector at
  // regeneration) — the client neither carries the dataset nor re-detects.
  const relevantScores = parallel ? scores.filter(s => parallel.rishis.some(r => s.name === r)) : [];

  return (
    <div style={{
      background: "rgba(17,24,39,0.85)", border: "1px solid rgba(30,41,59,0.8)",
      borderRadius: "16px", overflow: "hidden",
      position: "sticky", top: "80px",
    }}>
      {/* Tab Switcher */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
      }}>
        {[
          // Round-5 audit (finding 19): labels don't repeat the emoji — the
          // button renders {emoji} {label}, so "📜 Wisdom" + 📜 doubled it.
          { id: "wisdom" as const, label: "Wisdom", emoji: "📜" },
          { id: "chat" as const, label: "Chat", emoji: "💬" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMode(tab.id)}
            style={{
              flex: 1, padding: "10px", border: "none",
              background: activeMode === tab.id ? "rgba(212,175,55,0.1)" : "transparent",
              borderBottom: activeMode === tab.id ? "2px solid #D4AF37" : "2px solid transparent",
              color: activeMode === tab.id ? "#D4AF37" : "var(--text-muted)",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Wisdom Mode */}
      {activeMode === "wisdom" && (
        <div style={{ padding: "20px", maxHeight: "600px", overflowY: "auto" }}>
          {!parallel ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", padding: "40px 20px" }}>
              No historical parallels detected
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: "#D4AF37", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "6px" }}>
                  HISTORICAL WISDOM
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
                  {parallel.era}
                </h3>
                <div style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.7 }}>
                  {parallel.lesson}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "8px" }}>
                  SIMILAR COMPANIES:
                </div>
                {parallel.companies.filter(c => !c.toLowerCase().includes(stock.symbol.toLowerCase()) && !stock.name.toLowerCase().includes(c.toLowerCase())).map((c, i) => (
                  <div key={i} style={{
                    fontSize: "11px", color: "#94A3B8",
                    borderLeft: "2px solid rgba(212,175,55,0.3)",
                    paddingLeft: "10px", marginBottom: "6px",
                  }}>{c}</div>
                ))}
              </div>

              {relevantScores.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "8px" }}>
                    RELEVANT RISHIS:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {relevantScores.map(s => (
                      <div key={s.name} style={{
                        padding: "4px 10px", borderRadius: "6px",
                        background: "rgba(31,41,59,0.6)", border: "1px solid rgba(51,65,85,0.4)",
                        fontSize: "11px", color: "#94A3B8",
                      }}>
                        {s.name} ({s.score})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                paddingTop: "16px", borderTop: "1px solid rgba(51,65,85,0.4)",
              }}>
                <div style={{ fontSize: "10px", color: "#D4AF37", fontWeight: 700, marginBottom: "8px" }}>
                  RELATED QUOTE
                </div>
                <blockquote style={{ fontSize: "12px", fontStyle: "italic", color: "#94A3B8", lineHeight: 1.7, marginBottom: "8px" }}>
                  &quot;{parallel.quote}&quot;
                </blockquote>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "right" }}>
                  – {parallel.author}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Mode (Z5: loads on first activation) */}
      {activeMode === "chat" && (
        <WisdomChat stock={stock} scores={scores} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
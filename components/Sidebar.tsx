"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    title: "CORE",
    items: [
      { href: "/",            emoji: "⚡", label: "Dashboard"    },
      { href: "/screener",    emoji: "📊", label: "Screener"     },
      { href: "/portfolio",   emoji: "💼", label: "Portfolio"    },
      { href: "/watchlist",   emoji: "⭐", label: "Watchlist"    },
      { href: "/compare",     emoji: "⚖️", label: "Compare"     },
    ],
  },
  {
    title: "MARKETS",
    items: [
      { href: "/crypto",      emoji: "₿",  label: "Crypto"      },
      { href: "/forex",       emoji: "💱", label: "Forex"       },
      { href: "/commodities", emoji: "🥇", label: "Commodities" },
      { href: "/bonds",       emoji: "📜", label: "Bonds"       },
      { href: "/pulse",       emoji: "📡", label: "Market Pulse"},
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/fno/builder", emoji: "🎯", label: "F&O Builder"  },
      { href: "/rishis",      emoji: "🧘", label: "Rishis"       },
      { href: "/news",        emoji: "📰", label: "News"         },
      { href: "/backtest",    emoji: "🔬", label: "Backtest"     },
      { href: "/pricing",     emoji: "💎", label: "Pricing"      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px", minHeight: "100vh", height: "100vh",
      background: "linear-gradient(180deg, #050810 0%, #070C18 100%)",
      borderRight: "1px solid rgba(212,175,55,0.1)",
      display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0,
      zIndex: 100, overflowY: "auto", overflowX: "hidden",
    }}>

      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(212,175,55,0.08)",
        flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(139,92,246,0.25))",
              border: "1px solid rgba(212,175,55,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(212,175,55,0.15)",
            }}>🧘</div>
            <div>
              <div style={{
                fontFamily: "Cinzel, Georgia, serif",
                fontSize: "15px", fontWeight: 700,
                color: "#D4AF37", letterSpacing: "0.06em",
              }}>RISHI</div>
              <div style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "9px", color: "#475569",
                letterSpacing: "0.15em", fontWeight: 600,
              }}>TERMINAL v4.4</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "28px" }}>
            <div style={{
              fontSize: "9px", fontWeight: 800, color: "#334155",
              letterSpacing: "0.15em", padding: "0 12px", marginBottom: "6px",
              fontFamily: "Inter, sans-serif",
            }}>{group.title}</div>

            {group.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link href={item.href} key={item.href}
                  style={{ textDecoration: "none", display: "block" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 12px", borderRadius: "10px",
                    marginBottom: "2px", cursor: "pointer",
                    background: isActive
                      ? "linear-gradient(90deg,rgba(212,175,55,0.12),rgba(212,175,55,0.05))"
                      : "transparent",
                    borderLeft: isActive ? "2px solid #D4AF37" : "2px solid transparent",
                    transition: "all 0.15s ease",
                  }}>
                    <span style={{ fontSize: "15px", width: "20px", textAlign: "center", flexShrink: 0 }}>
                      {item.emoji}
                    </span>
                    <span style={{
                      fontSize: "13px", fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#E8CB6A" : "#64748B",
                      fontFamily: "Inter, sans-serif",
                    }}>{item.label}</span>
                    {isActive && (
                      <div style={{
                        marginLeft: "auto", width: "5px", height: "5px",
                        borderRadius: "50%", background: "#D4AF37",
                        boxShadow: "0 0 6px rgba(212,175,55,0.8)", flexShrink: 0,
                      }} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid rgba(212,175,55,0.08)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#22C55E", boxShadow: "0 0 8px rgba(34,197,94,0.7)",
          }} />
          <span style={{
            fontSize: "11px", color: "#22C55E", fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}>Live Market Data</span>
        </div>
        <Link href="/pricing" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(139,92,246,0.08))",
            border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: "10px", padding: "10px 12px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", marginBottom: "3px" }}>
              🌟 SEEKER PLAN
            </div>
            <div style={{ fontSize: "11px", color: "#475569", fontFamily: "Inter, sans-serif" }}>
              Upgrade for full access →
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
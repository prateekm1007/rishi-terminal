"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SadhuVectorLogo from "./SadhuVectorLogo";

const NAV_GROUPS = [
  {
    title: "CORE",
    items: [
      { href: "/",            label: "Dashboard",      icon: "terminal" },
      { href: "/screener",    label: "Screener",       icon: "filter"   },
      { href: "/lab",         label: "Portfolio Lab",  icon: "lab"      },
    ],
  },
  {
    title: "MARKETS",
    items: [
      { href: "/crypto",      label: "Crypto",         icon: "btc"      },
      { href: "/forex",       label: "Forex",          icon: "fx"       },
      { href: "/commodities", label: "Commodities",    icon: "gold"     },
      { href: "/bonds",       label: "Bonds",          icon: "bond"     },
      { href: "/pulse",       label: "Economy Plus",   icon: "pulse"    },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/fno/builder", label: "F&O Builder",    icon: "fno"      },
      { href: "/rishis",      label: "Chat with Rishis", icon: "rishi"  },
      { href: "/news",        label: "News",           icon: "news"     },
      { href: "/pricing",     label: "Pricing",        icon: "gem"      },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  terminal: <span>⌘</span>,
  filter:   <span>◫</span>,
  briefcase:<span>▣</span>,
  star:     <span>★</span>,
  scale:    <span>⚖</span>,
  lab:      <span>LAB</span>,
  btc:      <span>₿</span>,
  fx:       <span>¤</span>,
  gold:     <span>◆</span>,
  bond:     <span>▤</span>,
  pulse:    <span>◉</span>,
  fno:      <span>◈</span>,
  rishi:    <span>◌</span>,
  news:     <span>☰</span>,
  back:     <span>↺</span>,
  gem:      <span>◇</span>,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      height: "100vh",
      background: "linear-gradient(180deg, #050810 0%, #070C18 100%)",
      borderRight: "1px solid rgba(212,175,55,0.1)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
      overflowY: "auto",
      overflowX: "hidden",
    }}>

      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(212,175,55,0.08)",
      }}>
        <SadhuVectorLogo size={64} showText={true} />

        <div style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          color: "#475569",
          letterSpacing: "0.12em",
          marginTop: 12,
        }}>
          SACRED INVESTMENT OS
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "28px" }}>

            <div style={{
              fontSize: "9px",
              fontWeight: 800,
              color: "#334155",
              letterSpacing: "0.15em",
              padding: "0 12px",
              marginBottom: "6px",
              fontFamily: "Inter, sans-serif",
            }}>
              {group.title}
            </div>

            {group.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  href={item.href}
                  key={item.href}
                   onMouseEnter={() => {
                     if (item.href === "/news") {
                       fetch("/api/news").catch(() => {});
                     }
                   }}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    marginBottom: "2px",
                    cursor: "pointer",
                    background: isActive
                      ? "linear-gradient(90deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))"
                      : "transparent",
                    borderLeft: isActive
                      ? "2px solid #D4AF37"
                      : "2px solid transparent",
                    transition: "all 0.15s ease",
                  }}>

                    <span style={{
                      width: "20px",
                      textAlign: "center",
                      color: isActive ? "#D4AF37" : "#64748B",
                      fontSize: "15px",
                      flexShrink: 0,
                    }}>
                      {ICONS[item.icon]}
                    </span>

                    <span style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#E8CB6A" : "#64748B",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {item.label}
                    </span>

                    {isActive && (
                      <div style={{
                        marginLeft: "auto",
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "#D4AF37",
                        boxShadow: "0 0 6px rgba(212,175,55,0.8)",
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{
        padding: "16px",
        borderTop: "1px solid rgba(212,175,55,0.08)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "12px",
        }}>
          <div style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#22C55E",
            boxShadow: "0 0 8px rgba(34,197,94,0.7)",
          }} />

          <span style={{
            fontSize: "11px",
            color: "#22C55E",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}>
            Live Market Data
          </span>
        </div>

        <Link href="/pricing" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(139,92,246,0.08))",
            border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: "10px",
            padding: "10px 12px",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#D4AF37",
              marginBottom: "3px",
            }}>
              SEEKER PLAN
            </div>

            <div style={{
              fontSize: "11px",
              color: "#475569",
              fontFamily: "Inter, sans-serif",
            }}>
              Upgrade for full access
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

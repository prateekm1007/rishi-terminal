"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SadhuVectorLogo from "./SadhuVectorLogo";

const NAV_GROUPS = [
  {
    title: "CORE",
    items: [
      { href: "/",            label: "Dashboard",      icon: "\u25C6" },
      { href: "/screener",    label: "Screener",       icon: "\u25C7" },
      { href: "/lab",         label: "Portfolio Lab",  icon: "\u25A1" },
    ],
  },
  {
    title: "MARKETS",
    items: [
      { href: "/crypto",      label: "Crypto",         icon: "\u20BF" },
      { href: "/forex",       label: "Forex",          icon: "\u00A4" },
      { href: "/commodities", label: "Commodities",    icon: "\u25C6" },
      { href: "/bonds",       label: "Bonds",          icon: "\u25AD" },
      { href: "/pulse",       label: "Economy Plus",   icon: "\u25CF" },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/rishis",      label: "Chat with Rishis", icon: "\u2726" },
      { href: "/news",        label: "News",           icon: "\u25C8" },
      { href: "/pricing",     label: "Pricing",        icon: "\u25C7" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      height: "100vh",
      background: "#09090b",
      borderRight: "1px solid rgba(255,255,255,0.06)",
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

      <div style={{ padding: "28px 24px 24px" }}>
        <SadhuVectorLogo size={56} showText={true} />
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "9px",
          color: "#3f3f46",
          letterSpacing: "0.14em",
          marginTop: 14,
          fontWeight: 500,
        }}>
          INVESTMENT INTELLIGENCE
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "32px" }}>
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "#27272a",
              letterSpacing: "0.12em",
              padding: "0 12px",
              marginBottom: "8px",
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
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    marginBottom: "2px",
                    cursor: "pointer",
                    background: isActive
                      ? "rgba(255,255,255,0.05)"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}>
                    <span style={{
                      width: "20px",
                      textAlign: "center",
                      color: isActive ? "#e4e4e7" : "#52525b",
                      fontSize: "13px",
                      flexShrink: 0,
                      transition: "color 0.15s ease",
                    }}>
                      {item.icon}
                    </span>

                    <span style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fafafa" : "#71717a",
                      fontFamily: "Inter, sans-serif",
                      transition: "color 0.15s ease",
                    }}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#27272a",
          letterSpacing: "0.12em",
          marginBottom: "8px",
          fontFamily: "Inter, sans-serif",
        }}>
          THEME
        </div>
        <button
          onClick={() => {
                        const root = document.documentElement;
            const body = document.body;
            const current = body.classList.contains('theme-dark') ? 'dark' : 'blue';
            const next = current === 'dark' ? 'blue' : 'dark';

            root.classList.remove('theme-blue', 'theme-dark');
            body.classList.remove('theme-blue', 'theme-dark');

            root.classList.add('theme-' + next);
            body.classList.add('theme-' + next);

            try { localStorage.setItem('rishi.theme', next); } catch {}
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "#a1a1aa",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>🎨 Switch Theme</span>
          <span style={{ fontSize: "10px", opacity: 0.6 }}>⌘T</span>
        </button>
      </div>
      <div style={{ padding: "20px 16px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <div style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px rgba(34,197,94,0.5)",
          }} />
          <span style={{
            fontSize: "11px",
            color: "#22c55e",
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
          }}>
            Live
          </span>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SadhuVectorLogo from "./SadhuVectorLogo";
import { useLanguage } from "../lib/language";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV_GROUPS = [
    {
      title: t("nav.core"),
      items: [
        { href: "/",            label: t("nav.dashboard"),      icon: "◆" },
        { href: "/screener",    label: t("nav.screener"),       icon: "◇" },
        { href: "/lab",         label: t("nav.portfolioLab"),   icon: "□" },
      ],
    },
    {
      title: t("nav.markets"),
      items: [
        { href: "/crypto",      label: t("nav.crypto"),         icon: "₿" },
        { href: "/forex",       label: t("nav.forex"),          icon: "¤" },
        { href: "/commodities", label: t("nav.commodities"),    icon: "◆" },
        { href: "/bonds",       label: t("nav.bonds"),          icon: "▭" },
        { href: "/pulse",       label: t("nav.economyPlus"),    icon: "●" },
      ],
    },
    {
      title: t("nav.intelligence"),
      items: [
        { href: "/rishis",      label: t("nav.chatWithRishis"), icon: "✦" },
        { href: "/news",        label: t("nav.news"),           icon: "◈" },
        { href: "/pricing",     label: t("nav.pricing"),        icon: "◇" },
      ],
    },
  ];

  return (
    <aside style={{
      width: "220px",
      minHeight: "100vh",
      height: "100vh",
      background: "#111116",
      borderRight: "1px solid rgba(255,255,255,0.07)",
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

      {/* Logo area */}
      <div style={{
        padding: "28px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 8,
      }}>
        <SadhuVectorLogo size={48} showText={true} />
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "9px",
          color: "#6b6b7a",
          letterSpacing: "0.16em",
          marginTop: 10,
          fontWeight: 600,
        }}>
          INVESTMENT INTELLIGENCE
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px 24px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "24px" }}>

            {/* Group heading */}
            <div style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#6b6b7a",
              letterSpacing: "0.14em",
              padding: "0 12px",
              marginBottom: "4px",
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
            }}>
              {group.title}
            </div>

            {/* Nav items */}
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
                    if (item.href === "/news") fetch("/api/news").catch(() => {});
                  }}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "2px",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(251,191,36,0.08)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(251,191,36,0.12)"
                        : "1px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
                      }
                    }}
                  >
                    {/* Icon */}
                    <span style={{
                      width: "16px",
                      textAlign: "center",
                      color: isActive ? "#fbbf24" : "#8b8b9a",
                      fontSize: "11px",
                      flexShrink: 0,
                      transition: "color 0.15s ease",
                    }}>
                      {item.icon}
                    </span>

                    {/* Label */}
                    <span style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fef3c7" : "#9b9baa",
                      fontFamily: "Inter, sans-serif",
                      transition: "color 0.15s ease",
                      letterSpacing: "0.01em",
                      flex: 1,
                    }}>
                      {item.label}
                    </span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#fbbf24",
                        boxShadow: "0 0 6px rgba(251,191,36,0.6)",
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

      {/* Bottom version tag */}
      <div style={{
        padding: "12px 20px 16px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{
          fontSize: "10px",
          color: "#4b4b5a",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.08em",
        }}>
          RISHI TERMINAL v4.4
        </div>
      </div>

    </aside>
  );
}
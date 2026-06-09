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
        { href: "/",            label: t("nav.dashboard"),      icon: "\u25C6" },
        { href: "/screener",    label: t("nav.screener"),       icon: "\u25C7" },
        { href: "/lab",         label: t("nav.portfolioLab"),   icon: "\u25A1" },
      ],
    },
    {
      title: t("nav.markets"),
      items: [
        { href: "/crypto",      label: t("nav.crypto"),         icon: "\u20BF" },
        { href: "/forex",       label: t("nav.forex"),          icon: "\u00A4" },
        { href: "/commodities", label: t("nav.commodities"),    icon: "\u25C6" },
        { href: "/bonds",       label: t("nav.bonds"),          icon: "\u25AD" },
        { href: "/pulse",       label: t("nav.economyPlus"),    icon: "\u25CF" },
      ],
    },
    {
      title: t("nav.intelligence"),
      items: [
        { href: "/rishis",      label: t("nav.chatWithRishis"), icon: "\u2726" },
        { href: "/news",        label: t("nav.news"),           icon: "\u25C8" },
        { href: "/pricing",     label: t("nav.pricing"),        icon: "\u25C7" },
      ],
    },
  ];

  return (
    <aside style={{
      width: "220px",
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

      {/* Logo */}
      <div style={{ padding: "24px 20px 20px" }}>
        <SadhuVectorLogo size={52} showText={true} />
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "9px",
          color: "#52525b",
          letterSpacing: "0.14em",
          marginTop: 12,
          fontWeight: 500,
        }}>
          INVESTMENT INTELLIGENCE
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "4px 10px 24px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "28px" }}>

            {/* Group heading */}
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "#52525b",
              letterSpacing: "0.12em",
              padding: "0 10px",
              marginBottom: "6px",
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
                      padding: "9px 10px",
                      borderRadius: "8px",
                      marginBottom: "1px",
                      cursor: "pointer",
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = isActive ? "rgba(255,255,255,0.06)" : "transparent";
                    }}
                  >
                    <span style={{
                      width: "18px",
                      textAlign: "center",
                      color: isActive ? "#e4e4e7" : "#52525b",
                      fontSize: "12px",
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
                      letterSpacing: "0.01em",
                    }}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div style={{
                        marginLeft: "auto",
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        background: "linear-gradient(180deg, #fbbf24, #f59e0b)",
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

    </aside>
  );
}
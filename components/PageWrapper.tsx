"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface PageHeaderProps {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
}

export function PageHeader({ breadcrumbs, title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="content-wrapper">
        {/* Breadcrumbs */}
        <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--text-muted)", marginBottom: 16, letterSpacing: 1 }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {crumb.href ? (
                <Link href={crumb.href} style={{ color: "var(--accent-gold)" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span style={{ margin: "0 8px", color: "var(--border-primary)" }}>›</span>}
            </span>
          ))}
        </div>

        {/* Title Row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              {icon && <span style={{ fontSize: 40 }}>{icon}</span>}
              <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 36, color: "var(--text-primary)", fontWeight: 700, letterSpacing: 1 }}>
                {title}
              </h1>
            </div>
            {subtitle && (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.6 }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="content-wrapper">{children}</div>;
}
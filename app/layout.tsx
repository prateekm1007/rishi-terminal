import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { LanguageProvider } from "@/lib/language";
import AuthProvider from "@/components/auth/AuthProvider";
import { GlobalSearchBar } from "@/components/ui/GlobalSearchBar";
import { LegalDisclaimer } from "@/components/ui/LegalDisclaimer";
import { SITE_URL, SITE_NAME } from "@/lib/seo/site";

// Audit M6/B.3 (retest 2026-10-02): canonical + Open Graph + twitter were
// absent sitewide — parameterized URLs could split crawl equity and link
// unfurls (WhatsApp/X/LinkedIn) rendered as bare URLs. metadataBase anchors
// every relative canonical/og URL; route layouts add their own
// alternates.canonical (one line each), stock pages get per-symbol og.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Rishi Terminal - Sacred Investment Intelligence",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  description: "AI-powered investment wisdom from 20 legendary investors",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Rishi Terminal - Sacred Investment Intelligence",
    description: "AI-powered investment wisdom from 20 legendary investors",
  },
  twitter: {
    card: "summary",
    title: "Rishi Terminal - Sacred Investment Intelligence",
    description: "AI-powered investment wisdom from 20 legendary investors",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="theme-blue" suppressHydrationWarning>
      <body className="theme-blue" suppressHydrationWarning style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              var theme = localStorage.getItem('rishi.theme') || 'blue';
              document.documentElement.classList.add('theme-' + theme);
              document.body.classList.add('theme-' + theme);
            } catch {}
          })();
        `}} />
        <AuthProvider>
          <LanguageProvider>
            <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>

              {/* Audit 2026-10-02 (F): the shell offsets live in CSS classes
                  (.shell-main/.shell-topbar/.shell-sidebar) so the 900px
                  breakpoint can collapse them — inline styles always beat
                  media queries. The hamburger drawer serves mobile nav. */}
              <Sidebar />

              <HamburgerMenu />

              <TopBar />

              <main
                className="shell-main"
              >
                <div style={{
                  padding: "16px 24px 0 24px",
                  position: "relative",
                  zIndex: 50,
                }}>
                  <GlobalSearchBar />
                </div>
                {children}
                              <LegalDisclaimer />
              </main>

            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
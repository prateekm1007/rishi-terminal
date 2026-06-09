import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { LanguageProvider } from "@/lib/language";
import AuthProvider from "@/components/auth/AuthProvider";
import { GlobalSearchBar } from "@/components/ui/GlobalSearchBar";

export const metadata: Metadata = {
  title: "Rishi Terminal - Sacred Investment Intelligence",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  description: "AI-powered investment wisdom from 20 legendary investors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
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

              <Sidebar />

              <TopBar />

              <main style={{
                marginLeft: "220px",
                marginTop: "52px",
                flex: 1,
                minHeight: "calc(100vh - 52px)",
                overflowX: "hidden",
                overflowY: "auto",
                position: "relative",
                width: "calc(100vw - 220px)",
                maxWidth: "calc(100vw - 220px)",
              }}>
                <div style={{
                  padding: "16px 24px 0 24px",
                  position: "relative",
                  zIndex: 50,
                }}>
                  <GlobalSearchBar />
                </div>
                {children}
              </main>

            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
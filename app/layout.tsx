import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
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
      <body style={{
        margin: 0,
        padding: 0,
        background: "#020408",
        overflowX: "hidden"
      }}>
        <AuthProvider>
          <LanguageProvider>
            <div style={{
              display: "flex",
              minHeight: "100vh",
              position: "relative"
            }}>
              <Sidebar />
              <main style={{
                marginLeft: "240px",
                flex: 1,
                minHeight: "100vh",
                overflowX: "hidden",
                overflowY: "auto",
                position: "relative",
                width: "calc(100vw - 240px)",
                maxWidth: "calc(100vw - 240px)",
              }}>
                <div style={{
  padding: "16px 24px 0 24px",
  position: "relative",
  zIndex: 50
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
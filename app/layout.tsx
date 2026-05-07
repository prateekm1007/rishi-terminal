import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '../lib/theme';
import { LanguageProvider } from '../lib/language';
import { Sidebar } from '../components/Sidebar';
import { MobileNav } from '../components/MobileNav';
import { HamburgerMenu } from '../components/HamburgerMenu';

export const metadata: Metadata = {
  title: 'Rishi Terminal 4.0',
  description: 'Philosophical stock analysis engine',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LanguageProvider>
          <HamburgerMenu />
          <ThemeProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                {children}
              </main>
            </div>
          </ThemeProvider>
          <MobileNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
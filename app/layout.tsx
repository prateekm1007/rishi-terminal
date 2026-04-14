import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rishi Terminal 4.0 - Analyze Stocks Like Legends',
  description: 'Score any Indian stock using the exact formulas of Jhunjhunwala, Damani, Buffett, Graham & Lynch',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧘</text></svg>" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
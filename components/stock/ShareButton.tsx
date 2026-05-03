"use client";

import { Stock } from "../../lib/consensus/types";

interface Props {
  stock: Stock;
  consensus: number;
}

export function ShareButton({ stock, consensus }: Props) {
  const shareText = `${stock.name} (${stock.symbol}) — Rishi Consensus: ${consensus}/100`;

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank");
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + window.location.href)}`;
    window.open(url, "_blank");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard");
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={shareOnTwitter}
        className="px-4 py-2 text-xs border border-zinc-700 hover:bg-zinc-900 rounded font-mono transition-colors"
      >
        Share on X
      </button>
      <button
        onClick={shareOnWhatsApp}
        className="px-4 py-2 text-xs border border-zinc-700 hover:bg-zinc-900 rounded font-mono transition-colors"
      >
        WhatsApp
      </button>
      <button
        onClick={copyLink}
        className="px-4 py-2 text-xs border border-zinc-700 hover:bg-zinc-900 rounded font-mono transition-colors"
      >
        Copy Link
      </button>
    </div>
  );
}
"use client";

import { useState } from "react";
import { getViewsRemaining } from "../../lib/premium";

interface Props {
  reason: "limit_reached" | "locked_feature";
  onClose: () => void;
}

export function UpgradePrompt({ reason, onClose }: Props) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  if (!isVisible) return null;

  const viewsRemaining = getViewsRemaining();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-lg w-full mx-4 bg-zinc-900 border border-amber-700 rounded-xl p-8 shadow-2xl">
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🧘</div>
          <h2 className="font-cinzel text-2xl text-amber-400 mb-2">
            Unlock All Rishis
          </h2>
          <p className="text-sm text-zinc-400 font-mono">
            {reason === "limit_reached"
              ? `You've used all ${5 - viewsRemaining} free deep-dives today`
              : "This feature is for Premium users only"}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-4">
            <span className="text-5xl font-bold text-amber-400">499</span>
            <span className="text-zinc-500 font-mono">/year</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">Unlimited deep-dive access</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">All 30+ Rishis unlocked (Stock, Crypto, Forex, Commodity)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">AI Rishi Chat (talk to any Rishi)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">Advanced screener + CSV export</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">Portfolio analyzer + Custom Rishi blends</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-zinc-300">Ad-free experience</span>
            </div>
          </div>
        </div>

        <a
          href="/pricing"
          className="block w-full bg-amber-600 hover:bg-amber-700 text-black font-bold py-3 px-6 rounded-lg text-center transition-colors font-mono"
        >
          Upgrade to Premium
        </a>

        <p className="text-xs text-zinc-600 text-center mt-4 font-mono">
          Not investment advice · Educational tool only
        </p>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { setUserTier } from "../../lib/premium";

export default function PricingPage() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleMockUpgrade = () => {
    // In production, this would integrate with Razorpay
    setUserTier("premium");
    setShowSuccess(true);
    setTimeout(() => {
      window.location.href = "/screener";
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        <div className="text-center mb-16">
          <div className="text-6xl mb-4">🧘</div>
          <h1 className="font-cinzel text-4xl text-amber-400 mb-4">
            Rishi Terminal Premium
          </h1>
          <p className="text-zinc-400 font-mono text-sm">
            Unlock the wisdom of 30+ investment legends
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* Free Tier */}
          <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-8">
            <div className="mb-6">
              <h3 className="font-cinzel text-xl text-zinc-300 mb-2">Free Tier</h3>
              <div className="text-3xl font-bold text-zinc-400 font-mono">0</div>
            </div>

            <ul className="space-y-3 text-sm mb-8">
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-400">5 deep-dive views per day</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-400">Top 5 Rishis visible</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-400">Basic consensus score</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-400">Full screener access</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-700 shrink-0">✕</span>
                <span className="text-zinc-600">AI Rishi Chat</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-700 shrink-0">✕</span>
                <span className="text-zinc-600">Crypto, Forex, Commodity Rishis</span>
              </li>
            </ul>

            <div className="border border-zinc-800 bg-zinc-950 rounded-lg px-4 py-3 text-center">
              <span className="text-zinc-500 font-mono text-sm">Current Plan</span>
            </div>
          </div>

          {/* Premium Tier */}
          <div className="border-2 border-amber-600 bg-zinc-900 rounded-xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-black px-4 py-1 rounded-full text-xs font-bold font-mono">
              RECOMMENDED
            </div>

            <div className="mb-6">
              <h3 className="font-cinzel text-xl text-amber-400 mb-2">Premium</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-amber-400 font-mono">499</span>
                <span className="text-zinc-500 font-mono">/year</span>
              </div>
              <p className="text-xs text-zinc-600 mt-1 font-mono">~42/month</p>
            </div>

            <ul className="space-y-3 text-sm mb-8">
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300 font-semibold">Unlimited deep-dive access</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300 font-semibold">All 30+ Rishis unlocked</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Stock Rishis (19)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Crypto Rishis (7)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Forex Rishis (6)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Commodity Rishis (3)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300 font-semibold">AI Rishi Chat (talk to any Rishi)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Advanced screener + CSV export</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Portfolio analyzer</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Custom Rishi blends</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span className="text-zinc-300">Ad-free experience</span>
              </li>
            </ul>

            <button
              onClick={handleMockUpgrade}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black font-bold py-3 px-6 rounded-lg transition-colors font-mono"
            >
              Upgrade Now
            </button>

            {showSuccess && (
              <div className="mt-4 bg-emerald-900/50 border border-emerald-700 rounded-lg p-3 text-center">
                <p className="text-emerald-400 text-sm font-mono">
                  ✓ Upgraded to Premium! Redirecting...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-zinc-600 font-mono space-y-2">
          <p>Not investment advice · Educational simulation only</p>
          <p>Payment integration coming soon (Razorpay)</p>
        </div>
      </div>
    </main>
  );
}
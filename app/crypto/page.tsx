'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CRYPTO_ASSETS } from '../../data/crypto';
import { scoreBitcoinMaximalist } from '../../lib/scorers/crypto/bitcoin';
import { scoreEthereumProtocol } from '../../lib/scorers/crypto/ethereum';
import { scoreDeFiYieldFarmer } from '../../lib/scorers/crypto/defi';
import { sc } from '../../lib/utils';

const CRYPTO_GURUS = [
  { id: 'bitcoin', name: 'Bitcoin Maximalist', emoji: '₿', color: '#F59E0B', scorer: scoreBitcoinMaximalist, target: 'BTC' },
  { id: 'ethereum', name: 'Ethereum Protocol', emoji: '⟠', color: '#818CF8', scorer: scoreEthereumProtocol, target: 'ETH' },
  { id: 'defi', name: 'DeFi Yield Farmer', emoji: '🦄', color: '#10B981', scorer: scoreDeFiYieldFarmer, target: 'UNI' },
];

export default function CryptoPage() {
  const [sector, setSector] = useState('All');
  const sectors = ['All', ...Array.from(new Set(CRYPTO_ASSETS.map(c => c.sector)))];
  const filtered = sector === 'All' ? CRYPTO_ASSETS : CRYPTO_ASSETS.filter(c => c.sector === sector);

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 12 }}>← Dashboard</Link>
      <div style={{ fontSize: 22, color: '#818CF8', marginTop: 20 }}>CRYPTO GURUS</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 24 }}>
        {CRYPTO_GURUS.map(guru => {
          const asset = CRYPTO_ASSETS.find(c => c.symbol === guru.target);
          if (!asset) return null;
          const result = guru.scorer(asset);
          return (
            <div key={guru.id} style={{ background: '#09090F', border: `2px solid ${guru.color}30`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 32 }}>{guru.emoji}</div>
              <div style={{ fontSize: 16, color: '#F5E6D3', marginTop: 8 }}>{guru.name}</div>
              <div style={{ fontSize: 36, color: sc(result.score), fontWeight: 700, marginTop: 12 }}>{result.score}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>{result.insight}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {sectors.map(sec => (
            <button key={sec} onClick={() => setSector(sec)}
              style={{ background: sector === sec ? '#818CF815' : '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 16px', color: sector === sec ? '#818CF8' : '#64748B', fontSize: 11, cursor: 'pointer' }}>
              {sec}
            </button>
          ))}
        </div>
        
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#06060D' }}>
                <th style={{ padding: 10, color: '#475569', textAlign: 'left' }}>Asset</th>
                <th style={{ padding: 10, color: '#475569', textAlign: 'right' }}>Price</th>
                <th style={{ padding: 10, color: '#475569', textAlign: 'right' }}>24h</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.symbol} style={{ borderBottom: '1px solid #0F172A' }}>
                  <td style={{ padding: 10 }}>{c.emoji} {c.symbol}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#F1F5F9' }}>${c.price.toLocaleString()}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: c.change24h >= 0 ? '#10B981' : '#EF4444' }}>
                    {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
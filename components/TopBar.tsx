'use client';

import { useState, useEffect } from 'react';
import { LanguageSelector } from './LanguageSelector';

export default function TopBar() {
  const [theme, setTheme] = useState<'blue' | 'dark'>('blue');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rishi.theme');
      setTheme(saved === 'dark' ? 'dark' : 'blue');
    } catch {}
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const body = document.body;
    const current = body.classList.contains('theme-dark') ? 'dark' : 'blue';
    const next = current === 'dark' ? 'blue' : 'dark';
    root.classList.remove('theme-blue', 'theme-dark');
    body.classList.remove('theme-blue', 'theme-dark');
    root.classList.add('theme-' + next);
    body.classList.add('theme-' + next);
    try { localStorage.setItem('rishi.theme', next); } catch {}
    setTheme(next as 'blue' | 'dark');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      left: 220,
      height: 52,
      background: 'rgba(9,9,11,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '0 20px',
      zIndex: 90,
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
        }} />
        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>Live</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: '#e4e4e7',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.30)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
      >
        <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* Language Selector */}
      <div style={{ width: 170, flexShrink: 0, position: 'relative', zIndex: 9999 }}>
        <LanguageSelector />
      </div>

    </div>
  );
}
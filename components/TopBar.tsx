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
      background: '#0d0d10',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '0 20px',
      zIndex: 80,
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
        }} />
        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>Live</span>
      </div>

      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 12px',
          borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.09)',
          background: 'rgba(255,255,255,0.03)',
          color: '#e4e4e7',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.30)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
      >
        <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

      {/* Language selector — fixed width, no overflow clipping */}
      <div style={{ width: 168, flexShrink: 0 }}>
        <LanguageSelector />
      </div>

    </div>
  );
}
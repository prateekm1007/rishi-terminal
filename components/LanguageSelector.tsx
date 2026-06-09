'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/language';

const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English', nativeName: 'English' },
  { code: 'hi', short: 'HI', name: 'Hindi',   nativeName: 'हिंदी'  },
  { code: 'bn', short: 'BN', name: 'Bengali', nativeName: 'বাংলা'  },
  { code: 'mr', short: 'MR', name: 'Marathi', nativeName: 'मराठी'  },
  { code: 'te', short: 'TE', name: 'Telugu',  nativeName: 'తెలుగు' },
  { code: 'ta', short: 'TA', name: 'Tamil',   nativeName: 'தமிழ்'  },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cur = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', fontFamily: 'Inter, sans-serif' }}>

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          color: '#e4e4e7',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '1px 6px',
            borderRadius: 5,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#e4e4e7',
          }}>
            {cur.short}
          </span>
          <span style={{ color: '#e4e4e7' }}>{cur.nativeName}</span>
        </div>
        <span style={{ fontSize: 9, color: '#71717a' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown — rendered via portal-like fixed positioning to escape stacking context */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 56,
          right: 20,
          width: 200,
          background: '#111114',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          zIndex: 99999,
        }}>
          {LANGUAGES.map((lang, idx) => {
            const active = locale === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => { setLocale(lang.code as LangCode); setIsOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: active ? 'rgba(251,191,36,0.10)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < LANGUAGES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(251,191,36,0.10)' : 'transparent'; }}
              >
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 5,
                  background: active ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? 'rgba(251,191,36,0.30)' : 'rgba(255,255,255,0.10)'}`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: active ? '#fbbf24' : '#a1a1aa',
                  minWidth: 28,
                  textAlign: 'center' as const,
                }}>
                  {lang.short}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ fontSize: 13, color: active ? '#fbbf24' : '#e4e4e7', fontWeight: active ? 600 : 400 }}>
                    {lang.nativeName}
                  </span>
                  <span style={{ fontSize: 10, color: '#71717a' }}>{lang.name}</span>
                </div>
                {active && <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: 13 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
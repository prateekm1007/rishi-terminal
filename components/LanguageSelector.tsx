'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/language';

const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English',  nativeName: 'English' },
  { code: 'hi', short: 'HI', name: 'Hindi',    nativeName: 'हिंदी' },
  { code: 'bn', short: 'BN', name: 'Bengali',  nativeName: 'বাংলা' },
  { code: 'mr', short: 'MR', name: 'Marathi',  nativeName: 'मराठी' },
  { code: 'te', short: 'TE', name: 'Telugu',   nativeName: 'తెలుగు' },
  { code: 'ta', short: 'TA', name: 'Tamil',    nativeName: 'தமிழ்' },
] as const;

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  const badgeStyle: React.CSSProperties = {
    minWidth: 30,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.10em',
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '9px 10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: '#e4e4e7',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={badgeStyle}>{currentLang.short}</span>
          <span style={{ color: '#e4e4e7' }}>{currentLang.nativeName}</span>
        </div>
        <span style={{ fontSize: 10, color: '#71717a' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 6,
            background: '#0b0b0f',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 -12px 30px rgba(0,0,0,0.55)',
            zIndex: 2000,
          }}
        >
          {LANGUAGES.map((lang, idx) => {
            const isActive = locale === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code as any);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 10px',
                  background: isActive ? 'rgba(255,215,0,0.10)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < LANGUAGES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span style={{
                  ...badgeStyle,
                  color: isActive ? '#fbbf24' : '#a1a1aa',
                  borderColor: isActive ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.10)'
                }}>
                  {lang.short}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                  <span style={{ fontSize: 12, color: isActive ? '#fbbf24' : '#e4e4e7' }}>{lang.nativeName}</span>
                  <span style={{ fontSize: 10, color: '#71717a' }}>{lang.name}</span>
                </div>

                {isActive && <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
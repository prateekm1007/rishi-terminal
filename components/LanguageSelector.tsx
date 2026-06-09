'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/language';

const LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English',  flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिंदी',    flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা',    flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी',    flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',   flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',    flag: '🇮🇳' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

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

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          color: '#a1a1aa',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{currentLang.flag}</span>
          <span style={{ color: '#e4e4e7' }}>{currentLang.nativeName}</span>
        </div>
        <span style={{ fontSize: 9, color: '#52525b' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          marginBottom: 4,
          background: '#18181b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}>
          {LANGUAGES.map((lang, idx) => {
            const isActive = locale === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code as LangCode);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  background: isActive ? 'rgba(255,215,0,0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < LANGUAGES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  color: isActive ? '#fbbf24' : '#71717a',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive ? 'rgba(255,215,0,0.08)' : 'transparent';
                }}
              >
                <span style={{ fontSize: 14 }}>{lang.flag}</span>
                <span style={{ flex: 1, color: isActive ? '#fbbf24' : '#a1a1aa' }}>{lang.nativeName}</span>
                <span style={{ fontSize: 10, color: '#52525b' }}>{lang.name}</span>
                {isActive && <span style={{ color: '#fbbf24', fontSize: 11 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
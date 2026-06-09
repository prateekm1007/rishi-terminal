'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/language';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
] as const;

export function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-gold)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
          <span>{currentLang.name}</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
        }}>
          {LANGUAGES.map((lang) => (
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
                gap: 8,
                padding: '10px 12px',
                background: locale === lang.code ? 'rgba(255,215,0,0.1)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: locale === lang.code ? 'var(--accent-gold)' : 'var(--text-primary)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,215,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = locale === lang.code ? 'rgba(255,215,0,0.1)' : 'transparent')}
            >
              <span style={{ fontSize: 16 }}>{lang.flag}</span>
              <span>{lang.name}</span>
              {locale === lang.code && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent-gold)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
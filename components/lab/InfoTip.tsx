'use client';

import { useEffect, useRef, useState } from 'react';
import { GLOSSARY } from '@/lib/glossary';

type Props = {
  term: string;
  text?: string;
  delayMs?: number;
  children?: React.ReactNode;
  icon?: boolean;
};

export default function InfoTip(props: Props) {
  const { term, text, delayMs = 900, children, icon = true } = props;
  const [open, setOpen] = useState(false);
  const tRef = useRef<any>(null);

  const body = text ?? GLOSSARY[term] ?? 'No description available.';

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  const onEnter = () => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setOpen(true), delayMs);
  };

  const onLeave = () => {
    if (tRef.current) clearTimeout(tRef.current);
    setOpen(false);
  };

  return (
    <span
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'inherit',
        font: 'inherit',
        lineHeight: 'inherit',
        cursor: 'help',
        userSelect: 'none',
      }}
      aria-label={term}
    >
      <span style={{ borderBottom: '1px dotted rgba(148,163,184,0.6)' }}>
        {children ?? term}
      </span>

      {icon && (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 800,
            border: '1px solid rgba(148,163,184,0.35)',
            color: '#94A3B8',
            background: 'rgba(15,23,42,0.6)',
          }}
        >
          i
        </span>
      )}

      {open && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 'calc(100% + 8px)',
            minWidth: 260,
            maxWidth: 420,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#0B1220',
            border: '1px solid rgba(51,65,85,0.8)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            color: '#CBD5E1',
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            lineHeight: 1.5,
            zIndex: 9999,
            whiteSpace: 'normal',
          }}
        >
          <span style={{ display: 'block', fontWeight: 800, color: '#D4AF37', marginBottom: 6 }}>{term}</span>
          {body}
        </span>
      )}
    </span>
  );
}
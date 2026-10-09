'use client';

// X3-05 (Round 14 A6): the screener query bar — expression input, server
// evaluation, saved screens and CSV export. The expression NEVER runs in
// the browser: the server route parses + evaluates it (that is the
// product decision in the roadmap text), and this component only renders
// results/errors.
//
// INT-D1 (pre-registration: docs/intelligence/screening.md): an explicit
// two-way mode toggle — Expression | Natural language. No magic
// auto-detection of which grammar the user typed (honest UI). In natural
// mode the request carries mode:'natural' and the active-query line shows
// "understood as: <translated expression>" VERBATIM — the route echoes
// exactly what filter ran. `active` always holds the CANONICAL EXPRESSION
// (in natural mode: the route's translated `query`), so saved screens and
// CSV export stay replayable by the expression engine regardless of the
// mode that produced them — a saved screen replays in expression mode.

import { useCallback, useEffect, useState } from 'react';
import type { ScreenerPickerRow } from '@/lib/transport/slimWire';

interface SavedScreen {
  id: string;
  name: string;
  query: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  /** Rows matching the active expression (null = expression mode off). */
  onQueryResult: (rows: ScreenerPickerRow[] | null, q: string | null) => void;
}

const EXAMPLES: Record<QueryMode, string[]> = {
  expression: [
    'pe > 0 and roe > 15',
    'sector = "Banking" and de < 1',
    'consensus is not null and consensus >= 75',
    'mktcap > 10000 and revcagr > 10',
  ],
  natural: [
    'market cap above 50000 crore and roe above 15',
    'banks and debt below 1',
    'rishi score at least 75 excluding pharma',
    'consensus has no data',
  ],
};

type QueryMode = 'expression' | 'natural';

export function ScreenerQueryBar({ onQueryResult }: Props) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<QueryMode>('expression');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [ranNatural, setRanNatural] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const [saved, setSaved] = useState<SavedScreen[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/screens');
      if (res.status === 401) {
        setSignedIn(false);
        setSaved([]);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setSignedIn(true);
        setSaved(data.screens);
      }
    } catch {
      // Network hiccup: leave the list as-is (the panel shows nothing
      // misleading — an empty list only appears after a 200).
    }
  }, []);

  useEffect(() => {
    // Async deferral: setState only ever runs in the fetch continuation,
    // never synchronously during the effect.
    const t = setTimeout(() => {
      loadSaved();
    }, 0);
    return () => clearTimeout(t);
  }, [loadSaved]);

  async function runQuery(query: string, runMode: QueryMode = mode) {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/screener/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Natural mode is EXPLICIT — the route translates and echoes the
        // interpreted expression; expression mode stays byte-compatible.
        body: JSON.stringify(runMode === 'natural' ? { q: query, mode: 'natural' } : { q: query }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? 'query failed');
        return;
      }
      // `active` = the canonical expression. Natural mode: the route's
      // TRANSLATED expression (saved screens + CSV export stay
      // replayable); expression mode: the typed expression itself.
      const canonical = typeof data.query === 'string' ? data.query : query;
      setActive(canonical);
      setRanNatural(runMode === 'natural');
      setCount(data.count);
      // The API rows are a superset of the picker shape; extra fields are ignored.
      onQueryResult(data.rows as ScreenerPickerRow[], canonical);
    } catch {
      setError('network error — try again');
    } finally {
      setRunning(false);
    }
  }

  function switchMode(next: QueryMode) {
    if (next === mode) return;
    setMode(next);
    // The pending error came from the OTHER grammar — keeping it after a
    // mode switch would misattribute it.
    setError(null);
  }

  function clearQuery() {
    setActive(null);
    setCount(null);
    setError(null);
    setQ('');
    onQueryResult(null, null);
  }

  async function saveScreen() {
    if (!active) return;
    setSaveMsg(null);
    try {
      const res = await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName, q: active }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveMsg(data.error ?? 'could not save');
        return;
      }
      setSaveName('');
      setSaveMsg('saved');
      loadSaved();
    } catch {
      setSaveMsg('network error');
    }
  }

  async function deleteScreen(id: string) {
    try {
      await fetch(`/api/screens/${id}`, { method: 'DELETE' });
      loadSaved();
    } catch {
      // list refresh on next mount; the row stays until then
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10,
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={labelStyle}>CUSTOM QUERY — SERVER-SIDE ENGINE (SAFE PARSER, NO EVAL)</div>

      <div
        role="group"
        aria-label="Query mode"
        data-screener-mode={mode}
        style={{ display: 'inline-flex', gap: 0, marginBottom: 8, borderRadius: 10, overflow: 'hidden', outline: '1px solid rgba(51,65,85,0.6)' }}
      >
        {(['expression', 'natural'] as QueryMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: mode === m ? 'rgba(212,175,55,0.15)' : 'rgba(15,23,42,0.6)',
              color: mode === m ? '#D4AF37' : 'var(--text-muted)',
            }}
          >
            {m === 'expression' ? 'Expression' : 'Natural language'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) runQuery(q.trim());
          }}
          placeholder={
            mode === 'natural'
              ? 'e.g. market cap above 50000 crore and roe above 15'
              : 'e.g. pe > 0 and roe > 15 and sector = "Banking"'
          }
          spellCheck={false}
          style={{
            flex: '1 1 420px', minWidth: 260, padding: '10px 14px', borderRadius: 10,
            border: '1px solid rgba(51,65,85,0.6)', background: 'rgba(15,23,42,0.6)',
            color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={() => q.trim() && runQuery(q.trim())}
          disabled={running || !q.trim()}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(212,175,55,0.15)', outline: '1px solid rgba(212,175,55,0.4)',
            color: '#D4AF37', fontSize: 12, fontWeight: 700,
            opacity: running || !q.trim() ? 0.5 : 1,
          }}
        >
          {running ? 'RUNNING…' : 'RUN QUERY'}
        </button>
        {active && (
          <>
            <a
              href={`/api/screener/export?q=${encodeURIComponent(active)}`}
              style={{
                padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
                background: 'rgba(31,41,59,0.6)', outline: '1px solid rgba(51,65,85,0.4)',
                color: '#94A3B8', fontSize: 12, fontWeight: 700,
              }}
            >
              EXPORT CSV
            </a>
            <button
              onClick={clearQuery}
              style={{
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'rgba(31,41,59,0.6)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
              }}
            >
              CLEAR
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        {mode === 'expression' ? (
          <>
            fields: pe roe mktcap de revcagr fcf consensus tensionSpread symbol name sector category dataQuality ·
            operators: &gt; &gt;= &lt; &lt;= = != and or not ( ) ·
          </>
        ) : (
          <>
            try: return on equity · price to earnings · market cap · debt · revenue growth · free cash flow · rishi score ·
            council tension · comparisons: above, below, at least, at most, between X and Y · sectors: banks, pharma,
            software, energy… ·
          </>
        )}
        examples:{' '}
        {EXAMPLES[mode].map((ex, i) => (
          <span key={ex}>
            {i > 0 && ' · '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setQ(ex);
              }}
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              {ex}
            </a>
          </span>
        ))}
      </div>

      {error && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: 12,
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
          color: '#F87171', fontFamily: 'monospace',
        }}>
          QUERY ERROR — {error}
        </div>
      )}

      {active && !error && (
        <div
          style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: 12,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
            color: 'var(--accent-green)', fontFamily: 'monospace',
            display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
          }}
          // Production-leg contract: in natural mode the DOM carries the
          // TRANSLATED expression that actually ran (C1 transparency —
          // the user sees the interpretation, never a black box).
          data-screener-understood={ranNatural ? active : undefined}
        >
          <span>{count} stocks match</span>
          {ranNatural ? (
            <span>
              understood as: <code style={{ color: 'var(--text-muted)' }}>{active}</code>
            </span>
          ) : (
            <code style={{ color: 'var(--text-muted)' }}>{active}</code>
          )}
          {signedIn && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="screen name"
                maxLength={60}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(51,65,85,0.6)',
                  background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)',
                  fontFamily: 'monospace', fontSize: 11, width: 140,
                }}
              />
              <button
                onClick={saveScreen}
                disabled={!saveName.trim()}
                style={{
                  padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(212,175,55,0.15)', color: '#D4AF37',
                  fontSize: 11, fontWeight: 700, opacity: saveName.trim() ? 1 : 0.5,
                }}
              >
                SAVE
              </button>
              {saveMsg && <span style={{ color: 'var(--text-muted)' }}>{saveMsg}</span>}
            </span>
          )}
        </div>
      )}

      {signedIn === false && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          Sign in to save screens. Queries and CSV export work without an account.
        </div>
      )}

      {saved.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={labelStyle}>SAVED SCREENS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {saved.map((s) => (
              <span
                key={s.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 6px 6px 12px', borderRadius: 10,
                  background: 'rgba(31,41,59,0.6)', outline: '1px solid rgba(51,65,85,0.4)',
                }}
              >
                <button
                  title={s.query}
                  onClick={() => {
                    // Saved screens are EXPRESSIONS regardless of the mode
                    // that produced them — replay in expression mode.
                    setMode('expression');
                    setQ(s.query);
                    runQuery(s.query, 'expression');
                  }}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer', color: '#D4AF37',
                    fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
                  }}
                >
                  {s.name}
                </button>
                <button
                  onClick={() => deleteScreen(s.id)}
                  title="delete screen"
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: 12, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { STOCKS } from '../../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai } from '../../lib/scorers';
import { sc, getSig, SIG } from '../../lib/utils';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai];
const SYMBOLS = Object.keys(STOCKS);

function getComposite(sym: string) {
  const s = STOCKS[sym];
  const scores = SCORERS.map(fn => fn(s));
  return Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [addSym, setAddSym] = useState('TCS');
  const [editNote, setEditNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('rishi_watchlist');
    const savedNotes = localStorage.getItem('rishi_notes');
    if (saved) setWatchlist(JSON.parse(saved));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, []);

  const save = (list: string[], n: Record<string, string>) => {
    localStorage.setItem('rishi_watchlist', JSON.stringify(list));
    localStorage.setItem('rishi_notes', JSON.stringify(n));
  };

  const addStock = () => {
    if (!watchlist.includes(addSym)) {
      const next = [...watchlist, addSym];
      setWatchlist(next);
      save(next, notes);
    }
  };

  const removeStock = (sym: string) => {
    const next = watchlist.filter(s => s !== sym);
    setWatchlist(next);
    save(next, notes);
  };

  const saveNote = (sym: string) => {
    const next = { ...notes, [sym]: noteText };
    setNotes(next);
    save(watchlist, next);
    setEditNote(null);
    setNoteText('');
  };

  const exportCSV = () => {
    const rows = watchlist.map(sym => {
      const s = STOCKS[sym];
      const comp = getComposite(sym);
      return `${sym},${s.name},${s.sector},${s.price},${comp},${getSig(comp)}`;
    });
    const csv = ['Symbol,Name,Sector,Price,Composite,Signal', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rishi_watchlist.csv';
    a.click();
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap" />

      <div style={{ fontFamily: "'Cinzel',Georgia,serif", fontSize: 20, color: '#F59E0B', letterSpacing: 3, marginBottom: 4 }}>RISHI WATCHLIST</div>
      <div style={{ fontSize: 10, color: '#334155', letterSpacing: 2, marginBottom: 24 }}>SAVED STOCKS · LOCAL STORAGE</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={addSym} onChange={e => setAddSym(e.target.value)}
          style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 14px', color: '#E2E8F0', fontSize: 12, fontFamily: 'inherit' }}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s} — {STOCKS[s].name}</option>)}
        </select>
        <button onClick={addStock}
          style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 6, padding: '8px 18px', color: '#F59E0B', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add to Watchlist
        </button>
        {watchlist.length > 0 && (
          <button onClick={exportCSV}
            style={{ background: '#10B98115', border: '1px solid #10B98140', borderRadius: 6, padding: '8px 18px', color: '#10B981', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Export CSV
          </button>
        )}
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#334155' }}>
          {watchlist.length} stocks saved
        </span>
      </div>

      {watchlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#1E293B', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👁️</div>
          <div>Your watchlist is empty.</div>
          <div style={{ fontSize: 11, marginTop: 8 }}>Add stocks above to track their Rishi scores.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {watchlist.map(sym => {
            const s = STOCKS[sym];
            const composite = getComposite(sym);
            const sig = getSig(composite);
            return (
              <div key={sym} style={{ background: '#09090F', border: `1px solid ${sc(composite)}25`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, color: '#F59E0B', fontWeight: 600, marginRight: 10 }}>{sym}</span>
                    <span style={{ fontSize: 12, color: '#CBD5E1' }}>{s.name}</span>
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 10 }}>{s.sector}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: sc(composite) }}>{composite}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 3, background: `${SIG[sig]}15`, color: SIG[sig], fontSize: 10 }}>{sig}</span>
                    <span style={{ fontSize: 18, color: '#F1F5F9' }}>{s.price.toLocaleString()}</span>
                    <button onClick={() => { setEditNote(editNote === sym ? null : sym); setNoteText(notes[sym] || ''); }}
                      style={{ background: '#1E293B', border: 'none', borderRadius: 4, padding: '4px 8px', color: '#94A3B8', cursor: 'pointer', fontSize: 10 }}>
                      📝
                    </button>
                    <button onClick={() => removeStock(sym)}
                      style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: 4, padding: '4px 8px', color: '#EF4444', cursor: 'pointer', fontSize: 10 }}>
                      Remove
                    </button>
                  </div>
                </div>

                {notes[sym] && editNote !== sym && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#64748B', fontStyle: 'italic', padding: '6px 10px', background: '#0A0A16', borderRadius: 4 }}>
                    {notes[sym]}
                  </div>
                )}

                {editNote === sym && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note..."
                      style={{ flex: 1, background: '#0A0A16', border: '1px solid #1E293B', borderRadius: 4, padding: '6px 10px', color: '#E2E8F0', fontSize: 11, fontFamily: 'inherit' }}
                    />
                    <button onClick={() => saveNote(sym)}
                      style={{ background: '#10B98115', border: '1px solid #10B98140', borderRadius: 4, padding: '6px 12px', color: '#10B981', cursor: 'pointer', fontSize: 11 }}>
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 9, color: '#0F172A' }}>NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION</div>
    </div>
  );
}

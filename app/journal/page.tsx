'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadJournal,
  addJournalEntry,
  deleteJournalEntry,
  getRandomPrompt,
  getJournalStats,
  type JournalEntry,
  type JournalPrompt,
  JOURNAL_PROMPTS,
} from '../../lib/journal';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('');

  // Form state
  const [formType, setFormType] = useState<JournalEntry['type']>('REFLECTION');
  const [formSymbol, setFormSymbol] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formEmotion, setFormEmotion] = useState<JournalEntry['emotionalState']>('NEUTRAL');

  useEffect(() => {
    setEntries(loadJournal());
    setCurrentPrompt(getRandomPrompt());
  }, []);

  const refreshEntries = () => {
    setEntries(loadJournal());
  };

  const handleAddEntry = () => {
    if (!formTitle.trim() || !formBody.trim()) {
      alert('Title and body are required');
      return;
    }

    addJournalEntry({
      type: formType,
      symbol: formSymbol.trim().toUpperCase() || undefined,
      title: formTitle,
      body: formBody,
      emotionalState: formEmotion,
      tags: [],
    });

    // Reset form
    setFormTitle('');
    setFormBody('');
    setFormSymbol('');
    setFormType('REFLECTION');
    setFormEmotion('NEUTRAL');
    setShowAddModal(false);
    refreshEntries();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this journal entry?')) {
      deleteJournalEntry(id);
      refreshEntries();
    }
  };

  const stats = getJournalStats();

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    if (filterSymbol && (!e.symbol || !e.symbol.includes(filterSymbol.toUpperCase()))) return false;
    return true;
  });

  const typeColor = (type: JournalEntry['type']) => {
    switch (type) {
      case 'BUY': return 'var(--accent-green)';
      case 'SELL': return 'var(--accent-red)';
      case 'HOLD': return 'var(--accent-gold)';
      case 'REFLECTION': return '#60a5fa';
      case 'LESSON': return '#c084fc';
      default: return 'var(--text-muted)';
    }
  };

  const emotionEmoji = (emotion?: JournalEntry['emotionalState']) => {
    switch (emotion) {
      case 'CONFIDENT': return '💪';
      case 'FEARFUL': return '😰';
      case 'GREEDY': return '🤑';
      case 'UNCERTAIN': return '🤔';
      case 'NEUTRAL': return '😐';
      default: return '';
    }
  };

  return (
    <main className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>INVESTMENT JOURNAL</span>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
                Investment Journal
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                Document decisions, emotions, and lessons. The examined investment is the only one worth making.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ✍️ New Entry
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>TOTAL ENTRIES</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
            </div>

            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>{type}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: typeColor(type as JournalEntry['type']) }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24, marginBottom: 32 }}>
          {/* Main Feed */}
          <div>
            {/* Filters */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>FILTER:</div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <option value="ALL">All Types</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="HOLD">Hold</option>
                  <option value="REFLECTION">Reflection</option>
                  <option value="LESSON">Lesson</option>
                </select>

                <input
                  type="text"
                  placeholder="Filter by symbol..."
                  value={filterSymbol}
                  onChange={e => setFilterSymbol(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 6,
                    fontSize: 12,
                    width: 160,
                  }}
                />

                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                  Showing {filteredEntries.length} of {entries.length}
                </div>
              </div>
            </div>

            {/* Entries List */}
            {filteredEntries.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📔</div>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
                  No Entries Yet
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Start your investment journal by documenting your first decision or reflection.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ✍️ Write First Entry
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 1,
                          background: `${typeColor(entry.type)}20`,
                          color: typeColor(entry.type),
                        }}>
                          {entry.type}
                        </span>
                        {entry.symbol && (
                          <Link
                            href={`/stock/${entry.symbol}`}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'var(--bg-secondary)',
                              color: 'var(--accent-gold)',
                              textDecoration: 'none',
                            }}
                          >
                            {entry.symbol}
                          </Link>
                        )}
                        {entry.emotionalState && (
                          <span style={{ fontSize: 18 }}>{emotionEmoji(entry.emotionalState)}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            color: 'var(--accent-red)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 16,
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>
                      {entry.title}
                    </h3>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {entry.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Daily Prompt */}
            {currentPrompt && (
              <div className="card" style={{ padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, var(--bg-card) 100%)' }}>
                <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
                  💡 REFLECTION PROMPT
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                  {currentPrompt.question}
                </p>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  <strong>Context:</strong> {currentPrompt.context}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  — {currentPrompt.philosophy}
                </div>
                <button
                  onClick={() => setCurrentPrompt(getRandomPrompt())}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  🔄 New Prompt
                </button>
              </div>
            )}

            {/* All Prompts */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
                ALL REFLECTION PROMPTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {JOURNAL_PROMPTS.map((prompt, i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid var(--accent-gold)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
                      {prompt.question}
                    </p>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      — {prompt.philosophy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: 'var(--text-primary)', marginBottom: 24 }}>
              New Journal Entry
            </h2>

            {/* Type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                ENTRY TYPE
              </label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as JournalEntry['type'])}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                <option value="BUY">Buy Decision</option>
                <option value="SELL">Sell Decision</option>
                <option value="HOLD">Hold Decision</option>
                <option value="REFLECTION">Reflection</option>
                <option value="LESSON">Lesson Learned</option>
              </select>
            </div>

            {/* Symbol (optional) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                SYMBOL (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="RELIANCE, TCS, etc."
                value={formSymbol}
                onChange={e => setFormSymbol(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                TITLE *
              </label>
              <input
                type="text"
                placeholder="Entry title..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* Body */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                BODY *
              </label>
              <textarea
                placeholder="What happened? What did you learn? What were you feeling?"
                value={formBody}
                onChange={e => setFormBody(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Emotional State */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                EMOTIONAL STATE
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['CONFIDENT', 'FEARFUL', 'GREEDY', 'NEUTRAL', 'UNCERTAIN'] as const).map(emotion => (
                  <button
                    key={emotion}
                    onClick={() => setFormEmotion(emotion)}
                    style={{
                      padding: '8px 16px',
                      background: formEmotion === emotion ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                      color: formEmotion === emotion ? '#000' : 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: formEmotion === emotion ? 700 : 400,
                    }}
                  >
                    {emotionEmoji(emotion)} {emotion}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleAddEntry}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Save Entry
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormTitle('');
                  setFormBody('');
                  setFormSymbol('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
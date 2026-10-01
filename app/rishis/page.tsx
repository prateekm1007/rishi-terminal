'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/language';
import { ALL_RISHIS } from '../../lib/chat/personas';


interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Audit 2026-10-02 (P1): provenance retained with the reply so the UI
   * can say WHICH provider produced it and whether it is grounded — a
   * context-only reply must not look like numerically verified analysis
   * (FD-10 records the open product decision). */
  provenance?: {
    provider: string;
    model: string;
    grounded: boolean;
    groundingMode: 'evidence-context' | 'structured-claims';
  };
}

interface ChatHistory {
  [rishiId: string]: Message[];
}



const TIER_COLORS: Record<string, string> = {
  Legend: '#FFD700',
  Master: '#3B82F6',
};

export default function ChatWithRishisPage() {
  const { t } = useLanguage();
  const [selectedRishi, setSelectedRishi] = useState(ALL_RISHIS[0]);
  const [chatHistories, setChatHistories]   = useState<ChatHistory>({});
  const [input, setInput]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const messagesEndRef                       = useRef<HTMLDivElement>(null);
  const inputRef                             = useRef<HTMLTextAreaElement>(null);

  const currentMessages = chatHistories[selectedRishi.id] || [];

  const filteredRishis = useMemo(() =>
    ALL_RISHIS.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.label.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  const selectRishi = (rishi: typeof ALL_RISHIS[0]) => {
    setSelectedRishi(rishi);
    setInput('');
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };

    const updatedHistory = [...currentMessages, userMsg];
    setChatHistories(prev => ({ ...prev, [selectedRishi.id]: updatedHistory }));
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedRishi.id,
          history: currentMessages,
          message: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      if (!data.text) {
        throw new Error('Empty response from API');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
        provenance: data.provenance ?? undefined,
      };
      setChatHistories(prev => ({
        ...prev,
        [selectedRishi.id]: [...updatedHistory, assistantMsg],
      }));
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
      // Remove the user message if API failed
      setChatHistories(prev => ({ ...prev, [selectedRishi.id]: currentMessages }));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setChatHistories(prev => ({ ...prev, [selectedRishi.id]: [] }));
    setError(null);
  };

  const tierColor = TIER_COLORS[selectedRishi.tier] || '#888';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>

      {/* ── LEFT PANEL: Rishi List ── */}
      <div style={{ width: 280, borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 8 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>HOME</Link>
            {' > '}CHAT WITH RISHIS
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-gold)', marginBottom: 10, letterSpacing: 1 }}>
            🧘 Chat with Rishis
          </h1>
          <input
            type="text"
            placeholder="Search rishis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 12,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)', fontFamily: 'monospace', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Rishi List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filteredRishis.map(rishi => {
            const isActive  = selectedRishi.id === rishi.id;
            const hasChat   = (chatHistories[rishi.id] || []).length > 0;
            const tColor    = TIER_COLORS[rishi.tier] || '#888';
            return (
              <div
                key={rishi.id}
                onClick={() => selectRishi(rishi)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${tColor}` : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{rishi.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? tColor : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rishi.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {rishi.label}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 10, background: tColor + '20', color: tColor, fontWeight: 700, fontFamily: 'monospace' }}>
                    {rishi.tier.toUpperCase()}
                  </span>
                  {hasChat && (
                    <span style={{ fontSize: 8, color: '#00BA7C' }}>● active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Chat Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{selectedRishi.emoji}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: tierColor }}>{selectedRishi.name}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: tierColor + '20', color: tierColor, fontWeight: 700, fontFamily: 'monospace' }}>
                  {selectedRishi.tier.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                {selectedRishi.label} · {selectedRishi.origin}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right' }}>
              <div>{selectedRishi.bestFor.join(' · ')}</div>
            </div>
            {currentMessages.length > 0 && (
              <button onClick={clearChat} style={{ padding: '5px 12px', borderRadius: 5, background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Empty state */}
          {currentMessages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>{selectedRishi.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: tierColor, marginBottom: 8 }}>{selectedRishi.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.7, marginBottom: 20 }}>
                &quot;{selectedRishi.quote}&quot;
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: 24 }}>
                {selectedRishi.bio}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '12px 20px', borderRadius: 8, maxWidth: 420, lineHeight: 1.7, textAlign: 'left' }}>
                <div style={{ marginBottom: 6, color: tierColor, fontWeight: 700 }}>FORMULA</div>
                {selectedRishi.formula}
              </div>
              <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
                Ask anything about stocks, markets, investing, or life ↓
              </div>
            </div>
          )}

          {/* Messages */}
          {currentMessages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 2 }}>
                {msg.role === 'user' ? 'YOU' : selectedRishi.name.toUpperCase()}
              </div>
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: 12,
                background: msg.role === 'user'
                  ? tierColor
                  : 'var(--bg-secondary)',
                color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                borderTopRightRadius: msg.role === 'user' ? 4 : 12,
                borderTopLeftRadius: msg.role === 'user' ? 12 : 4,
                border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
              }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.provenance && (
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 3, lineHeight: 1.5 }}>
                  {msg.provenance.provider}/{msg.provenance.model} ·{' '}
                  <span style={{ color: msg.provenance.grounded ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {msg.provenance.grounded ? 'evidence-grounded · numbers checked' : 'context-only · not numerically verified'}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {selectedRishi.name.toUpperCase()}
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: tierColor,
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, background: '#1a0000',
              border: '1px solid #ff4444', color: '#ff6666', fontSize: 12, fontFamily: 'monospace',
            }}>
              ⚠️ {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={`Ask ${selectedRishi.name} anything... (Enter to send, Shift+Enter for new line)`}
              rows={2}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none',
                outline: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                background: isLoading || !input.trim() ? 'var(--bg-hover)' : tierColor,
                color: isLoading || !input.trim() ? 'var(--text-muted)' : '#000',
                border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap', height: 'fit-content',
              }}
            >
              {isLoading ? '...' : 'Send →'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>
            Powered by Agnes 2.5 Flash · {currentMessages.length} messages · Chat history preserved per Rishi
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 2px; }
      `}</style>
    </div>
  );
}

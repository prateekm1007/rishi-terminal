// ============================================================
// CHAT SESSION MANAGER
// Persists conversations, manages context, handles multi-Rishi state
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'rishi';
  rishiId?: string;
  rishiName?: string;
  rishiEmoji?: string;
  text: string;
  timestamp: Date;
  metadata?: {
    responseTime?: number;
    tokenCount?: number;
    confidence?: number;
  };
}

export interface ChatSession {
  id: string;
  symbol?: string;
  type: 'stock' | 'portfolio' | 'strategy' | 'general';
  rishiId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: Record<string, any>;
}

export interface DebateSession {
  id: string;
  symbol?: string;
  rishiIds: [string, string] | [string, string, string];
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SESSIONS_KEY = 'rishi_chat_sessions';
const DEBATE_KEY = 'rishi_debate_sessions';

export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as ChatSession[];
    return sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function createSession(
  rishiId: string,
  symbol?: string,
  type: 'stock' | 'portfolio' | 'strategy' | 'general' = 'general'
): ChatSession {
  const session: ChatSession = {
    id: 'session_' + Date.now(),
    symbol,
    type,
    rishiId,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const sessions = loadSessions();
  saveSessions([...sessions, session]);
  return session;
}

export function getSession(id: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === id) || null;
}

export function getSessionsBySymbol(symbol: string): ChatSession[] {
  const sessions = loadSessions();
  return sessions.filter(s => s.symbol === symbol);
}

export function getSessionsByRishi(rishiId: string): ChatSession[] {
  const sessions = loadSessions();
  return sessions.filter(s => s.rishiId === rishiId);
}

export function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): void {
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  session.messages.push(message);
  session.updatedAt = new Date();
  saveSessions(sessions);
}

export function deleteSession(id: string): void {
  const sessions = loadSessions();
  saveSessions(sessions.filter(s => s.id !== id));
}

export function loadDebateSessions(): DebateSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEBATE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as DebateSession[];
    return sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch {
    return [];
  }
}

export function saveDebateSessions(sessions: DebateSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEBATE_KEY, JSON.stringify(sessions));
}

export function createDebateSession(
  rishiIds: [string, string] | [string, string, string],
  symbol?: string
): DebateSession {
  const session: DebateSession = {
    id: 'debate_' + Date.now(),
    symbol,
    rishiIds,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const sessions = loadDebateSessions();
  saveDebateSessions([...sessions, session]);
  return session;
}

export function addMessageToDebate(
  sessionId: string,
  message: ChatMessage
): void {
  const sessions = loadDebateSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  session.messages.push(message);
  session.updatedAt = new Date();
  saveDebateSessions(sessions);
}
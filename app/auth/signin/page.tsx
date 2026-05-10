'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleEmailSignIn() {
    if (!email) return;
    setLoading(true);
    await signIn('credentials', { email, password: '', callbackUrl: '/' });
    setSent(true);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 20, padding: 40,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: '#D4AF37', marginBottom: 8 }}>
            Rishi Terminal
          </h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            Sign in to access your portfolio, watchlist & alerts
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              padding: '13px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(51,65,85,0.5)' }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(51,65,85,0.5)' }} />
          </div>

          {/* Email */}
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSignIn()}
            style={{
              padding: '13px 16px', borderRadius: 10,
              background: 'rgba(5,8,16,0.8)', border: '1px solid rgba(51,65,85,0.6)',
              color: '#F8FAFC', fontSize: 14,
            }}
          />
          <button
            onClick={handleEmailSignIn}
            disabled={loading || !email}
            style={{
              padding: '13px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: loading || !email ? 'not-allowed' : 'pointer',
              background: loading || !email ? 'rgba(51,65,85,0.5)' : 'linear-gradient(135deg,#A88B20,#D4AF37)',
              border: 'none', color: loading || !email ? '#64748B' : '#0A0F1C',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ Signing in...' : '→ Continue with Email'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 24, lineHeight: 1.6 }}>
          By signing in, you agree to our Terms of Service.
          Your data is protected and never sold.
        </p>
      </div>
    </main>
  );
}
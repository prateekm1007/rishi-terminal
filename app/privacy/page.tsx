import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Rishi Terminal',
  description: 'What data Rishi Terminal collects, where it lives, and what never happens to it.',
};

/**
 * Round-5 audit (finding 9): the sign-in page claimed "Your data is
 * protected and never sold" with no policy behind the claim. This page
 * enumerates what the code actually stores (server + localStorage) so the
 * claim is defined rather than vague. (FD-13: counsel review.)
 */
export default function PrivacyPage() {
  return (
    <main className="page-bg">
      <div className="page-content page-header" style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 64 }}>
        <Link href="/" className="back-link">← Back to Rishi Terminal</Link>
        <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Version 1 · effective October 2026</p>

        <div className="card-unified" style={{ padding: 24, marginTop: 24, display: 'grid', gap: 20 }}>
          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>1. The short version</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              We collect the minimum needed to run your account. We do not sell your
              personal data, and we do not share it with advertisers. Much of what the product stores —
              watchlists, notes, local preferences — lives only in your own browser and never reaches our
              servers unless you are signed in and the feature requires it.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>2. What we store on the server (signed-in use)</h2>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: 20 }}>
              <li>Account: your email address and authentication credentials managed by our auth provider.</li>
              <li>Historical payments (2026, retired): if you ever purchased a subscription, the order reference and granted-access dates remain on record for accounting; no new payments are processed and card details never touched our servers (our former payment provider, Razorpay, handled them). Nothing about these records changes what you can access — every feature is free now.</li>
              <li>Product use needed for abuse prevention: per-day usage counters tied to your account.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>3. What stays in your browser (localStorage)</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Watchlists, notes, chat histories with the Rishi personas, the one-time disclaimer acceptance,
              and language and layout preferences. These live in your
              browser&rsquo;s localStorage. You can clear them at any time from your browser settings, and
              clearing them removes them permanently.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>4. Chat with the Rishis</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              When you send a chat message, the message (plus the stock context needed to answer) is sent to
              our AI provider (Google Gemini) to generate the reply. We send only what is needed for that
              request. Chat histories shown in the app are stored in your browser (localStorage), not on our
              servers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>5. Cookies</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              We use a session cookie to keep you signed in. We do not use advertising or cross-site tracking
              cookies.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>6. Your controls</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              You can delete your account, which removes your email and usage records from our database
              (historical payment records, if any, are retained only as long as accounting law requires).
              Browser-stored data you control directly from your browser. To exercise any of these, contact us
              from the address you signed up with.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, color: 'var(--accent-gold)', marginBottom: 8 }}>7. What we never do</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              We never sell your personal data. We never share it with advertisers or data brokers. We never
              use your watchlists or notes for anything beyond running the features you see.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

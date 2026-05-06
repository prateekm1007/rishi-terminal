'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Stock page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card-sacred p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="philosophy-heading text-2xl mb-4">
          Wisdom Temporarily Obscured
        </h2>
        <p className="text-sm text-secondary mb-6">
          {error.message || 'An error occurred while loading this stock. The Rishis are meditating on the issue.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-accent-gold text-black rounded-lg font-bold hover:bg-accent-gold/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="block w-full px-6 py-3 bg-secondary border border-primary rounded-lg hover:bg-card transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-muted cursor-pointer hover:text-accent-gold">
              Debug Info (Dev Mode)
            </summary>
            <pre className="mt-2 p-3 bg-zinc-900 rounded text-xs overflow-auto max-h-40 text-red-400">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
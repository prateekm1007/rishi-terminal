'use client';
import React from 'react';

type Props = { name: string; children: React.ReactNode };
type State = { hasError: boolean; message: string; stack: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '', stack: '' };

  static getDerivedStateFromError(error: any): State {
    return {
      hasError: true,
      message: String(error?.message ?? error),
      stack: String(error?.stack ?? ''),
    };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[Lab ErrorBoundary:' + this.props.name + ']', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 18, borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#EF4444', marginBottom: 10 }}>
          {this.props.name} crashed
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#FDA4AF', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {this.state.message}
        </div>
        {this.state.stack && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#FCA5A5', fontSize: 11 }}>stack</summary>
            <pre style={{ marginTop: 8, fontSize: 10, color: '#FCA5A5', whiteSpace: 'pre-wrap' }}>{this.state.stack}</pre>
          </details>
        )}
      </div>
    );
  }
}
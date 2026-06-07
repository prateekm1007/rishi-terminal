'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1001,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 8,
          padding: 12,
          cursor: 'pointer',
          display: 'none',
        }}
        className="hamburger-btn"
      >
        <div style={{ width: 20, height: 2, background: 'var(--accent-gold)', marginBottom: 4, borderRadius: 2 }} />
        <div style={{ width: 20, height: 2, background: 'var(--accent-gold)', marginBottom: 4, borderRadius: 2 }} />
        <div style={{ width: 20, height: 2, background: 'var(--accent-gold)', borderRadius: 2 }} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
            }}
            className="mobile-sidebar-overlay"
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              zIndex: 1000,
              animation: 'slideInLeft 0.2s ease',
            }}
            className="mobile-sidebar"
          >
            <Sidebar />
          </div>
        </>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.hamburger-btn) {
            display: block !important;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
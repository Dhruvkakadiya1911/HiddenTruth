'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('App Router Uncaught Error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem 2rem',
          background: 'rgba(18, 20, 32, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: 'var(--neon-red)',
            textTransform: 'uppercase',
          }}
        >
          ⚠️ FORENSIC INTERRUPT
        </span>

        <h2
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: '1.8rem',
            fontWeight: 900,
            color: '#fff',
          }}
        >
          Investigation Stalled
        </h2>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.55,
          }}
        >
          {error?.message || 'A network disturbance or runtime exception interrupted the dossier.'}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.4rem',
              background: 'linear-gradient(135deg, var(--neon-cyan), #0284c7)',
              color: '#fff',
              fontFamily: 'var(--f-display)',
              fontSize: '0.88rem',
              fontWeight: 700,
              borderRadius: 'var(--r-md)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
          <Link
            href="/"
            style={{
              padding: '0.75rem 1.4rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--f-display)',
              fontSize: '0.88rem',
              fontWeight: 700,
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
            }}
          >
            Headquarters
          </Link>
        </div>
      </div>
    </div>
  );
}

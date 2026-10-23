'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem 2rem',
          background: 'rgba(18, 20, 32, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 42, 81, 0.3)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 42, 81, 0.2)',
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
          🚨 404 // DOSSIER MISSING
        </span>

        <h1
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: '2.2rem',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}
        >
          Crime Scene Unreachable
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          The room code or case file you are looking for does not exist, has expired, or has been erased from the archives.
        </p>

        <Link
          href="/"
          style={{
            marginTop: '0.5rem',
            padding: '0.85rem 1.8rem',
            background: 'linear-gradient(135deg, var(--neon-red), #b91c1c)',
            color: '#fff',
            fontFamily: 'var(--f-display)',
            fontSize: '0.92rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: 'var(--r-md)',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(255, 42, 81, 0.4)',
          }}
        >
          Return to Headquarters
        </Link>
      </motion.div>
    </div>
  );
}

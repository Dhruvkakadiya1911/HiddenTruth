'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RevealScene from '@/components/RevealScene';
import LoadingSpinner from '@/components/LoadingSpinner';
import s from './page.module.css';


export default function RevealPage({ params }) {
  const roomCode = (params.code || '').toUpperCase();

  const [revealData, setRevealData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guarantee Reveal screen always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    async function loadReveal() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/reveal?roomCode=${roomCode}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to uncover the final reveal.');
        }

        setRevealData(data);
      } catch (err) {
        console.error('Error fetching reveal data:', err);
        setError(err.message || 'Failed to load case finale.');
      } finally {
        setLoading(false);
      }
    }

    loadReveal();
  }, [roomCode]);

  if (loading) {
    return (
      <div className={s.page}>
        <LoadingSpinner label="Tallying the votes... Let's see who did it!" />
      </div>
    );
  }


  if (error || !revealData) {
    return (
      <div className={s.page}>
        <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '420px', padding: '1.5rem' }}>
          <h2 style={{ color: 'var(--neon-red)', marginBottom: '1rem' }}>Game Results Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error || 'Could not load the case results.'}
          </p>
          <Link href="/" style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      {/* Background Ambience */}
      <div className={s.bgOrb1} />
      <div className={s.bgOrb2} />

      {/* Header */}
      <header className={s.header}>
        <span className={s.titleBadge}>HiddenTruth // THE REVEAL</span>
        <span className={s.roomTag}>ROOM: {roomCode}</span>
      </header>

      {/* Main Content */}
      <main className={s.main}>
        <RevealScene
          scenario={revealData.scenario}
          killer={revealData.killer}
          killerName={revealData.killerName}
          groupWon={revealData.groupWon}
          mostVoted={revealData.mostVoted}
          totalVotes={revealData.totalVotes}
          voteBreakdown={revealData.voteBreakdown}
          players={revealData.players}
          narratorMonologue={revealData.narratorMonologue}
          verdictSummary={revealData.verdictSummary}
        />
      </main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // Nothing Is What It Seems.
      </footer>
    </div>
  );
}

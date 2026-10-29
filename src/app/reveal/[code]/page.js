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
      <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner label="Tallying the jury ballots... Unmasking the truth!" />
      </div>
    );
  }

  if (error || !revealData) {
    return (
      <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <h2 style={{ color: '#FF2D55', marginBottom: '1rem', fontFamily: 'Unbounded, sans-serif' }}>
            Results Offline
          </h2>
          <p style={{ color: '#A49CC4', marginBottom: '1.5rem' }}>
            {error || 'Could not load the case results.'}
          </p>
          <Link href="/" className="btn glass" style={{ padding: '10px 20px', borderRadius: '12px' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      {/* Background Atmosphere */}
      <div className={s.bgLayer} aria-hidden="true" />

      {/* ── Header matching Reference ── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.brandGroup}>
            <span className={s.brandDot} />
            <span className={s.brandTitle}>
              HIDDEN<span className={s.brandRed}>TRUTH</span>
            </span>
          </div>

          <span className={s.caseClosedPill}>CASE CLOSED</span>

          <div style={{ flex: 1 }} />

          <span className={s.roomPill}>
            Room <span className={s.roomCode}>{roomCode}</span>
          </span>
        </div>
      </header>

      {/* ── Main Reveal Scene ── */}
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
          roomCode={roomCode}
        />
      </main>
    </div>
  );
}

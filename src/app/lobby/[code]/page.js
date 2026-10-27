'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { useSupabaseRoom } from '@/hooks/useSupabaseRoom';
import PlayerCard from '@/components/PlayerCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { MIN_PLAYERS, MAX_PLAYERS, GAME_STATUS } from '@/lib/constants';
import s from './page.module.css';


export default function LobbyPage({ params }) {
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();
  const { player, clearPlayer } = usePlayer();
  const { room, players, loading, error } = useSupabaseRoom(roomCode);

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [addingBots, setAddingBots] = useState(false);
  const [botError, setBotError] = useState('');
  const [isTestEnv, setIsTestEnv] = useState(false);

  // Detect test/local development environment (never displays in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsTestEnv(process.env.NODE_ENV !== 'production' || isLocalHost);
    }
  }, []);

  // Guarantee Lobby screen always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const handleLeaveLobby = (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      'Are you sure you want to leave this game room?'
    );
    if (!confirmed) return;
    clearPlayer();
    router.push('/', { scroll: true });
  };

  // Auto-redirect all players when game status changes
  useEffect(() => {
    if (!room) return;
    if (room.status === GAME_STATUS.PLAYING) {
      router.push(`/game/${roomCode}`, { scroll: true });
    } else if (room.status === GAME_STATUS.VOTING) {
      router.push(`/vote/${roomCode}`, { scroll: true });
    } else if (room.status === GAME_STATUS.FINISHED) {
      router.push(`/reveal/${roomCode}`, { scroll: true });
    }
  }, [room, room?.status, roomCode, router]);

  // Guard: player must be part of this room
  useEffect(() => {
    if (loading || !room) return;
    if (!player?.id || (player?.roomCode && player.roomCode !== roomCode)) {
      router.push(`/join?code=${roomCode}`, { scroll: true });
    }
  }, [loading, room, player, roomCode, router]);


  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Determine if current visitor is the room host
  const isHost =
    player?.isHost && (player?.roomId === room?.id || player?.roomCode === roomCode);

  const playerCount = players.length;
  const canStart = playerCount >= MIN_PLAYERS;

  // Handler to add mock test suspects in local development (eliminates needing multiple incognito windows)
  const handleAddTestBots = async () => {
    if (addingBots || !room || !isHost) return;
    setAddingBots(true);
    setBotError('');
    try {
      const res = await fetch('/api/rooms/test-bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          roomCode,
          targetCount: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add test suspects.');
      }
    } catch (err) {
      console.error('Error adding test suspects:', err);
      setBotError(err.message || 'Failed to add test suspects.');
    } finally {
      setAddingBots(false);
    }
  };

  // Placeholder handler for starting game (will call Step 6 AI scenario generation API)
  const handleStartGame = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, roomCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game.');
      }
      router.push(`/game/${roomCode}`, { scroll: true });
    } catch (err) {
      console.error('Start game error:', err);
      // If Step 6 endpoint is not built yet, we notify the user
      alert(err.message || 'Game start is being connected in Step 6.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className={s.page}>
        <LoadingSpinner label="Connecting to encrypted room..." />
      </div>
    );
  }


  if (error || !room) {
    return (
      <div className={s.page}>
        <div className={s.container} style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--neon-red)', marginBottom: '1rem' }}>Room Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error || `Room "${roomCode}" does not exist or has expired.`}
          </p>
          <Link href="/" className={s.backLink}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      {/* Background Ambience */}
      <div className={s.bgLayer}>
        <div className={s.bgGrid} />
        <div className={s.orbRed} />
        <div className={s.orbViolet} />
      </div>

      {/* Top Nav */}
      <header className={s.topNav}>
        <button
          type="button"
          onClick={handleLeaveLobby}
          className={s.backLink}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          ← Leave Room
        </button>
        <div className={s.liveBadge}>
          <span className={s.liveDot} />
          Lobby Live
        </div>
      </header>

      {/* Main Container */}
      <motion.main
        className={s.container}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {/* Room Code Showcase */}
        <div className={s.codeBox}>
          <span className={s.codeLabel}>Room Invitation Code</span>
          <div className={s.codeDisplay}>{roomCode}</div>

          <button
            onClick={handleCopyCode}
            className={`${s.copyBtn} ${copied ? s.copied : ''}`}
            id="btn-copy-code"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
          </button>

          <p className={s.codeHint}>
            Share this 4-letter code with friends to join.
          </p>
        </div>

        {/* Players Section */}
        <section className={s.playersSection}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitle}>
              <span>Players Joined</span>
              <span className={s.countBadge}>
                {playerCount}/{MAX_PLAYERS}
              </span>
            </div>
            <span className={s.minRequirement}>
              Min. {MIN_PLAYERS} required
            </span>
          </div>

          <div className={s.playerList}>
            <AnimatePresence>
              {players.map((p, idx) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCurrentPlayer={player?.id === p.id}
                  index={idx}
                />
              ))}
            </AnimatePresence>

            {/* Hint slots if below minimum */}
            {playerCount < MIN_PLAYERS && (
              <div className={s.emptySlot}>
                <span className={s.emptySlotDot} />
                <span>Waiting for {MIN_PLAYERS - playerCount} more player{MIN_PLAYERS - playerCount > 1 ? 's' : ''} to join...</span>
              </div>
            )}
          </div>
        </section>

        {/* Action Area: Host vs Guest */}
        <div className={s.actionArea}>
          {isHost ? (
            <div>
              <motion.button
                onClick={handleStartGame}
                disabled={!canStart || starting}
                className={s.btnStart}
                id="btn-start-game"
                whileTap={{ scale: 0.98 }}
              >
                <span>⚡</span>
                <span>{starting ? 'Preparing Investigation...' : 'Start Investigation ⚡'}</span>
              </motion.button>

              {/* Dev Only: Auto-fill test suspects to eliminate opening multiple incognito windows */}
              {isTestEnv && playerCount < 4 && (
                <div className={s.testDevBox}>
                  <button
                    type="button"
                    onClick={handleAddTestBots}
                    disabled={addingBots}
                    className={s.btnTestBots}
                  >
                    <span>🧪</span>
                    <span>{addingBots ? 'Summoning Test Suspects...' : 'Add Test Suspects (Dev Only)'}</span>
                  </button>
                  <span className={s.testDevHint}>
                    Fills room to 4 players for solo testing on localhost — hidden in production.
                  </span>
                  {botError && <span className={s.testDevError}>{botError}</span>}
                </div>
              )}

              {!canStart && (
                <p className={s.stateNotice}>
                  Need at least {MIN_PLAYERS} players to start the mystery.
                </p>
              )}
            </div>
          ) : (
            <div className={s.waitingCard}>
              <span className={s.pulseRadar} />
              <span>Waiting for the Host to start the investigation...</span>
            </div>
          )}
        </div>
      </motion.main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // Realtime Party Sync
      </footer>
    </div>
  );
}

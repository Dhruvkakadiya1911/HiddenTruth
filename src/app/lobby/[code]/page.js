'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import { useSupabaseRoom } from '@/hooks/useSupabaseRoom';
import LoadingSpinner from '@/components/LoadingSpinner';
import AgentFigure from '@/components/AgentFigure';
import HowToPlayModal from '@/components/HowToPlayModal';
import CaseWritingScreen from '@/components/CaseWritingScreen';
import { MIN_PLAYERS, MAX_PLAYERS, GAME_STATUS } from '@/lib/constants';
import s from './page.module.css';

const LOBBY_TINTS = [
  '#3FD0E8', // Cyan
  '#9B6BFF', // Purple
  '#F2B33D', // Amber
  '#FF5C8A', // Pink
  '#2EE6A8', // Mint
  '#FF8A3D', // Orange
  '#E5193A', // Crimson
  '#6BE4FF', // Sky
  '#FFB74D', // Gold
  '#A49CC4', // Slate
];

export default function LobbyPage({ params }) {
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();
  const { player, clearPlayer } = usePlayer();
  const { room, players, loading, error } = useSupabaseRoom(roomCode);

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [caseReady, setCaseReady] = useState(false);
  const [addingBots, setAddingBots] = useState(false);
  const [botError, setBotError] = useState('');
  const [isTestEnv, setIsTestEnv] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsTestEnv(process.env.NODE_ENV !== 'production' || isLocalHost);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleLeaveLobby = (e) => {
    e.preventDefault();
    const confirmed = window.confirm('Are you sure you want to leave this game room?');
    if (!confirmed) return;
    clearPlayer();
    router.push('/', { scroll: true });
  };

  useEffect(() => {
    if (!room) return;
    if (room.status === GAME_STATUS.PLAYING) {
      setStarting(true);
      setCaseReady(true);
    } else if (room.status === GAME_STATUS.VOTING) {
      router.push(`/vote/${roomCode}`, { scroll: true });
    } else if (room.status === GAME_STATUS.FINISHED) {
      router.push(`/reveal/${roomCode}`, { scroll: true });
    }
  }, [room, room?.status, roomCode, router]);

  useEffect(() => {
    if (loading || !room) return;
    if (!player?.id || (player?.roomCode && player.roomCode !== roomCode)) {
      router.push(`/join?code=${roomCode}`, { scroll: true });
    }
  }, [loading, room, player, roomCode, router]);

  const handleCopyCode = async () => {
    try {
      const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${roomCode}` : roomCode;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const isHost = Boolean(
    player?.isHost && (player?.roomId === room?.id || player?.roomCode === roomCode)
  );

  const playerCount = players.length;
  const canStart = playerCount >= MIN_PLAYERS;
  const needed = Math.max(0, MIN_PLAYERS - playerCount);

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

  const handleStartGame = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    setCaseReady(false);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, roomCode }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned ${res.status}.`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game.');
      }
      // Signal CaseWritingScreen that case generation is complete!
      setCaseReady(true);
    } catch (err) {
      console.error('Start game error:', err);
      alert(err.message || 'Failed to start investigation.');
      setStarting(false);
      setCaseReady(false);
    }
  };

  // Full-screen narrative radar screen when game is starting / case being written
  if (starting) {
    return (
      <CaseWritingScreen
        roomCode={roomCode}
        isComplete={caseReady || room?.status === GAME_STATUS.PLAYING}
        onComplete={() => router.push(`/game/${roomCode}`, { scroll: true })}
      />
    );
  }

  if (loading) {
    return (
      <div className={s.page} style={{ display: 'grid', placeItems: 'center' }}>
        <LoadingSpinner label="Accessing secret waiting room..." />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={s.page} style={{ display: 'grid', placeItems: 'center' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '440px' }}>
          <h2 style={{ color: '#E5193A', marginBottom: '14px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '42px' }}>
            Room Not Found
          </h2>
          <p style={{ color: '#A9A5B4', marginBottom: '24px' }}>
            {error || `Room "${roomCode}" does not exist or has expired.`}
          </p>
          <Link href="/" className="b-red">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // 10 slots
  const slots = Array.from({ length: 10 }, (_, i) => {
    const p = players[i] || null;
    const isMe = p && p.id === player?.id;
    const tint = LOBBY_TINTS[i % LOBBY_TINTS.length];
    return {
      index: i,
      player: p,
      isMe,
      tint,
    };
  });

  const codeLetters = [0, 1, 2, 3].map((i) => roomCode[i] || '•');

  return (
    <div className={s.page}>
      {/* ── Fixed Clean Header matching Design System ── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerLeft}>
            <button
              type="button"
              onClick={handleLeaveLobby}
              className={s.btnLeave}
              aria-label="Leave room"
              title="Leave room"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className={s.brandGroup}>
              <span className={s.brandDot} />
              <span className={s.brandTitle}>
                Hidden<span className={s.brandRed}>Truth</span>
              </span>
            </div>
            <span className={s.roomPill}>
              <span className={s.roomLabel}>Room </span><b className={s.roomCode}>{roomCode}</b>
            </span>
          </div>

          <div className={s.headerRight}>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className={s.btnGuide}
              aria-label="How to play guide"
            >
              📖 Guide
            </button>
            <span className={s.statusPill}>
              <span className={s.liveDot} />
              <span className={s.statusTextFull}>Lobby Live</span>
              <span className={s.statusTextMobile}>Live</span>
            </span>
          </div>
        </div>
      </header>

      <div className={s.wrap}>
        {/* Left Card: Room Code & Action */}
        <div className={`card rise ${s.codeCard}`}>
          <span className="mono-tag" style={{ color: '#B8B3C2' }}>Room code</span>
          <div className={s.codeDisplay}>
            {codeLetters.map((l, i) => (
              <span
                key={i}
                className="disp flick"
                style={{
                  fontSize: 'clamp(80px, 12vw, 140px)',
                  color: i === 3 ? '#E5193A' : '#ECE8E1',
                  textShadow: i === 3 ? '0 0 40px rgba(229,25,58,.6)' : 'none',
                  animationDelay: `${i * 0.6}s`,
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, color: '#A9A5B4', fontSize: '15px' }}>
            Everyone opens HiddenTruth on their device and enters this 4-letter code.
          </p>

          <button type="button" onClick={handleCopyCode} className="chip" style={{ alignSelf: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {copied ? 'Link Copied!' : 'Copy invite link'}
          </button>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {isHost ? (
              <>
                <button
                  type="button"
                  className="b-red"
                  style={{ width: '100%' }}
                  disabled={!canStart || starting}
                  onClick={handleStartGame}
                >
                  {starting
                    ? 'AI writing case dossier...'
                    : !canStart
                    ? `Need ${needed} more suspect${needed === 1 ? '' : 's'}`
                    : 'Start the investigation'}
                </button>

                {isTestEnv && playerCount < 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleAddTestBots}
                      disabled={addingBots}
                      className="b-ghost"
                      style={{ width: '100%', height: '46px', fontSize: '12px', borderColor: 'rgba(183,108,255,.4)', color: '#B76CFF' }}
                    >
                      🧪 {addingBots ? 'Summoning suspects...' : 'Fill Room to 4 Players (Dev Only)'}
                    </button>
                    {botError && <span style={{ color: '#FF7B92', fontSize: '12px' }}>{botError}</span>}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,.02)', border: '1px dashed #2A2A34', fontSize: '14px', color: '#8E8A99', textAlign: 'center' }}>
                Waiting for host to start the case…
              </div>
            )}
            <p className="mono-tag" style={{ margin: 0, textAlign: 'center', color: '#5C5966' }}>
              3 to 10 players · 1 killer hidden among you
            </p>
          </div>
        </div>

        {/* Right Card: Suspect Slots */}
        <div className={`card rise r1 ${s.suspectsCard}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="disp" style={{ fontSize: '32px' }}>Joined suspects</span>
              <span className="chip" style={{ height: '24px', padding: '0 10px', fontSize: '11px', borderColor: 'rgba(63,208,232,.3)', color: '#3FD0E8' }}>
                Live
              </span>
            </div>
            <span className="mono-tag" style={{ color: '#3FD0E8' }}>
              {playerCount} / 10 joined
            </span>
          </div>

          <div className={s.slotsGrid}>
            {slots.map((slot) => {
              if (slot.player) {
                const isMe = slot.isMe;
                const isRoomHost = slot.player.is_host;
                const cleanName = slot.player.name?.replace(/\s*\((Bot|Test)\)/gi, '') || 'Suspect';

                return (
                  <div
                    key={slot.index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      background: '#0E0E13',
                      border: `1px solid ${isMe ? 'rgba(63,208,232,.45)' : '#22222C'}`,
                      boxShadow: isMe ? '0 0 20px -6px rgba(63,208,232,.3)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#151520',
                        border: `1.5px solid ${slot.tint}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      <AgentFigure role="unknown" tint={slot.tint} size={48} variant="avatar" tilt={false} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cleanName}
                      </div>
                      <div className="mono-tag" style={{ color: isMe ? '#3FD0E8' : isRoomHost ? '#F2B33D' : '#B8B3C2', fontSize: '10px' }}>
                        {isMe ? '· You' : isRoomHost ? '· Host' : '· Suspect'}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={slot.index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px dashed #22222C',
                    color: '#5C5966',
                  }}
                >
                  <span
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: '1px dashed #22222C',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      fontSize: '18px',
                    }}
                  >
                    ?
                  </span>
                  <span className="mono-tag" style={{ fontSize: '11px' }}>Waiting…</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

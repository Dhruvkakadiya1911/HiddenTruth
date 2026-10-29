'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';
import VotePanel from '@/components/VotePanel';
import Timer from '@/components/Timer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { GAME_STATUS, TIMER_CONFIG } from '@/lib/constants';
import s from './page.module.css';

export default function VotePage({ params }) {
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();
  const { player } = usePlayer();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [revealing, setRevealing] = useState(false);

  // Guarantee Vote screen always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Fetch initial room, players & votes
  const fetchData = useCallback(async () => {
    if (!roomCode) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .maybeSingle();

      if (roomErr) throw roomErr;
      if (!roomData) throw new Error(`Room "${roomCode}" not found.`);
      setRoom(roomData);

      // Navigation guards
      if (roomData.status === GAME_STATUS.WAITING) {
        router.push(`/lobby/${roomCode}`, { scroll: true });
        return;
      }
      if (roomData.status === GAME_STATUS.PLAYING) {
        router.push(`/game/${roomCode}`, { scroll: true });
        return;
      }
      if (roomData.status === GAME_STATUS.FINISHED) {
        router.push(`/reveal/${roomCode}`, { scroll: true });
        return;
      }

      if (!player?.id || (player?.roomCode && player.roomCode !== roomCode)) {
        router.push(`/join?code=${roomCode}`, { scroll: true });
        return;
      }

      // 2. Players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      // 3. Votes
      const { data: votesData, error: votesErr } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomData.id);

      if (votesErr) throw votesErr;
      setVotes(votesData || []);

      // Check current player's vote
      if (player?.id && votesData) {
        const found = votesData.find((v) => v.voter_id === player.id);
        if (found) setMyVote(found);
      }
    } catch (err) {
      console.error('Error fetching vote data:', err);
      setError(err.message || 'Failed to load voting chamber.');
    } finally {
      setLoading(false);
    }
  }, [roomCode, player?.id, player?.roomCode, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for votes and room status
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`vote-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setVotes((prev) => {
            if (prev.some((v) => v.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.voter_id === player?.id) {
            setMyVote(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new);
          if (payload.new.status === GAME_STATUS.FINISHED) {
            router.push(`/reveal/${roomCode}`, { scroll: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, player?.id, roomCode, router]);

  // Handle vote submit
  const handleCastVote = async (suspectId) => {
    if (!room || !player?.id || voting || myVote) return;

    if (suspectId === player?.id) {
      setVoteError('You cannot vote for yourself.');
      return;
    }

    setVoting(true);
    setVoteError('');

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          voterId: player.id,
          suspectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote.');
      }

      setMyVote(data.vote || { voter_id: player.id, suspect_id: suspectId });

      if (data.finished || data.allVoted) {
        setTimeout(() => {
          router.push(`/reveal/${roomCode}`);
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setVoteError(err.message || 'Failed to submit vote.');
    } finally {
      setVoting(false);
    }
  };

  // Host manual reveal trigger
  const handleTriggerReveal = async () => {
    if (!room || revealing) return;
    setRevealing(true);

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          roomCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger reveal.');
      }

      router.push(`/reveal/${roomCode}`);
    } catch (err) {
      console.error('Error triggering reveal:', err);
      alert(err.message || 'Failed to trigger reveal.');
      setRevealing(false);
    }
  };

  // Auto-reveal countdown state
  const [autoRevealSeconds, setAutoRevealSeconds] = useState(null);
  const autoRevealTimerRef = useRef(null);

  const handleVoteTimeUp = () => {
    if (autoRevealTimerRef.current || revealing) return;

    let countdown = 5;
    setAutoRevealSeconds(countdown);

    autoRevealTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(autoRevealTimerRef.current);
        autoRevealTimerRef.current = null;
        setAutoRevealSeconds(null);

        if (player?.isHost) {
          handleTriggerReveal();
        } else {
          router.push(`/reveal/${roomCode}`);
        }
      } else {
        setAutoRevealSeconds(countdown);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (autoRevealTimerRef.current) {
        clearInterval(autoRevealTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner label="Preparing the suspect lineup..." />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#FF2D55', marginBottom: '1rem', fontFamily: 'Unbounded, sans-serif' }}>
            Room Unavailable
          </h2>
          <p style={{ color: '#A49CC4', marginBottom: '1.5rem' }}>
            {error || 'Could not locate room.'}
          </p>
          <Link href="/" className="btn glass" style={{ padding: '10px 20px', borderRadius: '12px' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const scenario = room.scenario || {};
  const isHost = player?.isHost && (player?.roomId === room?.id || player?.roomCode === roomCode);

  const getVotingStartTime = () => {
    if (scenario?.voting_started_at) {
      return scenario.voting_started_at;
    }
    if (typeof window !== 'undefined') {
      const storageKey = `ht_v_start_${roomCode}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(saved);
      const now = Date.now();
      localStorage.setItem(storageKey, String(now));
      return now;
    }
    return null;
  };

  const votingStartedAt = getVotingStartTime();

  return (
    <div className={s.page}>
      {/* Background Atmosphere */}
      <div className={s.bgLayer} aria-hidden="true" />

      {/* ── Header matching Reference ── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href={`/game/${roomCode}`} className={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to the board
          </Link>

          <div style={{ flex: 1 }} />

          <div className={s.brandGroup}>
            <span className={s.brandDot} />
            <span className={s.brandTitle}>
              HIDDEN<span className={s.brandRed}>TRUTH</span>
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <span className={s.roomPill}>
            Room <span className={s.roomCode}>{roomCode}</span>
          </span>
        </div>
      </header>

      {/* ── Auto-Reveal Emergency Banner ── */}
      <AnimatePresence>
        {autoRevealSeconds !== null && (
          <motion.div
            className={s.autoRevealBanner}
            style={{ maxWidth: '1240px', margin: '16px auto 0' }}
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <span style={{ fontSize: '24px' }}>⚖️</span>
            <div>
              <div className={s.autoRevealTitle}>VOTING TIME IS UP!</div>
              <div className={s.autoRevealSub}>
                All votes are locked. Revealing the killer in {autoRevealSeconds}s...
              </div>
            </div>
            <div className={s.countdownPill}>{autoRevealSeconds}s</div>
            {isHost && (
              <button
                type="button"
                className={s.btnRevealNow}
                onClick={handleTriggerReveal}
                disabled={revealing}
              >
                {revealing ? 'Revealing...' : 'Reveal Killer Now 🎬'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Lineup Content ── */}
      <main className={s.main}>
        {/* Title & Timer matching 02_Lineup_Vote */}
        <section className={`rise ${s.headlineRow}`}>
          <div className={s.headlineText}>
            <span className={s.preTitle}>The lineup · Final accusation</span>
            <h1 className={s.mainTitle}>
              Point at the <span className="grad-txt">killer.</span>
            </h1>
            <p className={s.mainSub}>
              Tap a suspect to put them in the spotlight, then lock it in. Most accused gets arrested.
            </p>
          </div>

          <Timer
            totalSeconds={TIMER_CONFIG.VOTE_DURATION_SECONDS}
            startedAt={votingStartedAt}
            onTimeUp={handleVoteTimeUp}
            variant="lineup"
          />
        </section>

        {/* Voting Panel: Police Lineup Wall & Decision Bar */}
        <VotePanel
          players={players}
          currentPlayer={player}
          hasVoted={Boolean(myVote)}
          myVotedSuspectId={myVote?.suspect_id}
          onVote={handleCastVote}
          voting={voting}
          error={voteError}
          votes={votes}
          isHost={isHost}
          onReveal={handleTriggerReveal}
          revealing={revealing}
          roomCode={roomCode}
        />
      </main>
    </div>
  );
}

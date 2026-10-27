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
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
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
  }, [roomCode, player?.id, router]);

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
      setVoteError('You cannot vote for yourself! Choose another suspect.');
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

      setMyVote(data.vote);
      setVotes((prev) => (prev.some((v) => v.id === data.vote.id) ? prev : [...prev, data.vote]));
    } catch (err) {
      console.error('Error casting vote:', err);
      setVoteError(err.message || 'Failed to submit vote.');
    } finally {
      setVoting(false);
    }
  };

  // Auto-reveal countdown state
  const [autoRevealSeconds, setAutoRevealSeconds] = useState(null);
  const autoRevealTimerRef = useRef(null);

  // Clear countdown if room status changes
  useEffect(() => {
    if (room?.status === GAME_STATUS.FINISHED) {
      setAutoRevealSeconds(null);
      if (autoRevealTimerRef.current) {
        clearInterval(autoRevealTimerRef.current);
        autoRevealTimerRef.current = null;
      }
    }
  }, [room?.status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoRevealTimerRef.current) {
        clearInterval(autoRevealTimerRef.current);
      }
    };
  }, []);

  // Host triggers final reveal
  const handleTriggerReveal = async () => {
    if (!room || revealing) return;
    if (autoRevealTimerRef.current) {
      clearInterval(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
    setAutoRevealSeconds(null);
    setRevealing(true);

    try {
      // Update room status to 'finished'
      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ status: GAME_STATUS.FINISHED })
        .eq('id', room.id);

      if (updateErr) throw updateErr;

      router.push(`/reveal/${roomCode}`, { scroll: true });
    } catch (err) {
      console.error('Error triggering reveal:', err);
      alert(err.message || 'Failed to initiate reveal sequence.');
      setRevealing(false);
    }
  };

  // Triggered when ballot Timer hits 00:00
  const handleVoteTimeUp = useCallback(() => {
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
          setTimeout(() => {
            if (room?.status === GAME_STATUS.VOTING) {
              handleTriggerReveal();
            }
          }, 3500);
        }
      } else {
        setAutoRevealSeconds(countdown);
      }
    }, 1000);
  }, [revealing, player?.isHost, room?.status]);

  if (loading) {
    return (
      <div className={s.page}>
        <LoadingSpinner label="Preparing the voting room..." />
      </div>
    );
  }


  if (error || !room) {
    return (
      <div className={s.page}>
        <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--neon-red)', marginBottom: '1rem' }}>Room Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error || 'Could not locate room.'}
          </p>
          <Link href="/" style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const scenario = room.scenario || {};
  const isHost = player?.isHost && (player?.roomId === room?.id || player?.roomCode === roomCode);
  const totalPlayers = players.length;
  const totalVotes = votes.length;
  const allVoted = totalPlayers > 0 && totalVotes >= totalPlayers;
  const progressPercent = totalPlayers > 0 ? Math.min(100, Math.round((totalVotes / totalPlayers) * 100)) : 0;

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
      {/* Ambience */}
      <div className={s.bgOrbRed} />
      <div className={s.bgOrbAmber} />

      {/* Header */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.titleBadge}>HiddenTruth // FINAL ACCUSATION</span>
          <span className={s.roomTag}>ROOM: {roomCode}</span>
        </div>
        <Timer
          totalSeconds={TIMER_CONFIG.VOTE_DURATION_SECONDS}
          startedAt={votingStartedAt}
          label="VOTING TIME"
          onTimeUp={handleVoteTimeUp}
          showExpiredBanner={false}
        />
        <Link href={`/game/${roomCode}`} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          ← Back to Game
        </Link>
      </header>

      {/* Auto-Reveal Countdown Banner */}
      <AnimatePresence>
        {autoRevealSeconds !== null && (
          <motion.div
            className={s.autoRevealBanner}
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <div className={s.autoRevealGlow} />
            <span className={s.autoRevealIcon}>⚖️</span>
            <div className={s.autoRevealText}>
              <div className={s.autoRevealTitle}>
                VOTING TIME IS UP!
              </div>
              <div className={s.autoRevealSub}>
                All votes are locked. Revealing the killer in {autoRevealSeconds}s...
              </div>
            </div>
            <div className={s.autoRevealCountdownPill}>
              {autoRevealSeconds}s
            </div>
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


      {/* Main Body */}
      <main className={s.main}>
        {/* Scenario Recall */}
        <motion.div
          className={s.scenarioCard}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className={s.scenarioPre}>Cast Your Final Accusation</span>
          <h1 className={s.scenarioTitle}>{scenario.title || 'The Murder Mystery'}</h1>
          <div className={s.scenarioMeta}>
            <div className={s.scenarioMetaItem}>
              Victim: <strong>{scenario.victim || 'Unknown'}</strong>
            </div>
            <div className={s.scenarioMetaItem}>
              Weapon: <strong>{scenario.weapon || 'Unknown'}</strong>
            </div>
            <div className={s.scenarioMetaItem}>
              Location: <strong>{scenario.setting || 'Unknown'}</strong>
            </div>
          </div>
        </motion.div>

        {/* Live Vote Progress Bar */}
        <motion.div
          className={s.progressCard}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className={s.progressHeader}>
            <span className={s.progressLabel}>
              {allVoted ? '✨ ALL PLAYERS HAVE VOTED!' : 'WAITING FOR VOTES'}
            </span>
            <span className={s.progressCount}>
              {totalVotes} of {totalPlayers} Voted ({progressPercent}%)
            </span>
          </div>
          <div className={s.progressBarTrack}>
            <div
              className={s.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </motion.div>

        {/* Voting Panel */}
        <VotePanel
          players={players}
          currentPlayer={player}
          hasVoted={Boolean(myVote)}
          myVotedSuspectId={myVote?.suspect_id}
          onVote={handleCastVote}
          voting={voting}
          error={voteError}
        />

        {/* Host Reveal Button Area */}
        {isHost && (
          <motion.div
            className={s.hostFinaleBox}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className={s.hostFinaleTitle}>
              👑 Host Controls
            </div>
            <div className={s.hostFinaleSub}>
              {allVoted
                ? 'All votes are locked in. Reveal the killer when ready!'
                : 'Waiting for everyone to vote. You can also reveal now if ready.'}
            </div>
            <button
              type="button"
              className={s.btnReveal}
              onClick={handleTriggerReveal}
              disabled={revealing}
            >
              {revealing ? 'Unmasking Killer...' : 'Reveal the Killer 🎬'}
            </button>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // Justice Shall Be Served
      </footer>
    </div>
  );
}

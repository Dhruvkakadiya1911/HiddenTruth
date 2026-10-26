'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameState } from '@/hooks/useGameState';
import NarratorBubble from '@/components/NarratorBubble';
import ClueCard from '@/components/ClueCard';
import Timer from '@/components/Timer';
import LoadingSpinner from '@/components/LoadingSpinner';
import RoleModelCanvas from '@/components/RoleModelCanvas';
import { ROLES, GAME_STATUS, TIMER_CONFIG } from '@/lib/constants';
import s from './page.module.css';



export default function GamePage({ params }) {
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();
  const { player, clearPlayer } = usePlayer();
  const { room, currentPlayer, players, clues, messages, loading, error, refreshState } =
    useGameState(roomCode, player?.id);

  const [hideSecret, setHideSecret] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [showAccuseModal, setShowAccuseModal] = useState(false);

  const handleLeaveGame = (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      'Are you sure you want to exit the active investigation? Your secret role and progress will be abandoned.'
    );
    if (!confirmed) return;
    clearPlayer();
    router.push('/');
  };
  const [accusedId, setAccusedId] = useState('');
  const [accuseReason, setAccuseReason] = useState('');
  const [submittingAccusation, setSubmittingAccusation] = useState(false);
  const [accuseError, setAccuseError] = useState('');

  // ─── NEW INTERACTIVE INVESTIGATION FEATURES ───
  // Special ability chat modes: 'chat' | 'anonymous' | 'rumor' | 'alibi' | 'defense'
  const [chatMode, setChatMode] = useState('chat');

  // Hot Seat Rapid Defense Spotlight
  const [showHotSeatModal, setShowHotSeatModal] = useState(false);
  const [hotSeatTargetId, setHotSeatTargetId] = useState('');
  const [hotSeatReason, setHotSeatReason] = useState('');
  const [submittingHotSeat, setSubmittingHotSeat] = useState(false);
  const [hotSeatSecondsLeft, setHotSeatSecondsLeft] = useState(0);

  // Detective Forensic Scan Ability
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanTargetId, setScanTargetId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);

  const chatBottomRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Ensure game screen always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  // Navigation guards & Auto-redirect on room status changes
  useEffect(() => {
    if (loading || !room) return;

    if (room.status === GAME_STATUS.WAITING) {
      router.push(`/lobby/${roomCode}`, { scroll: true });
      return;
    }
    if (room.status === GAME_STATUS.VOTING) {
      router.push(`/vote/${roomCode}`, { scroll: true });
      return;
    }
    if (room.status === GAME_STATUS.FINISHED) {
      router.push(`/reveal/${roomCode}`, { scroll: true });
      return;
    }

    // Guard: player must be part of this room
    if (!player?.id || (player?.roomCode && player.roomCode !== roomCode)) {
      router.push(`/join?code=${roomCode}`, { scroll: true });
    }
  }, [loading, room, room?.status, roomCode, player, router]);


  // Auto-scroll ONLY internal chat box to latest message (never jumps the browser window)
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── HOT SEAT TICKER & COMPUTATIONS ───
  const latestHotSeat = useMemo(() => {
    const hs = [...messages].reverse().find((m) => m.type === 'hotseat');
    if (!hs) return null;
    const createdAt = new Date(hs.created_at).getTime();
    const elapsed = Math.floor((Date.now() - createdAt) / 1000);
    if (elapsed > 45) return null;
    return hs;
  }, [messages]);

  useEffect(() => {
    if (!latestHotSeat) {
      setHotSeatSecondsLeft(0);
      return;
    }
    const createdAt = new Date(latestHotSeat.created_at).getTime();
    const updateTicker = () => {
      const elapsed = Math.floor((Date.now() - createdAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setHotSeatSecondsLeft(remaining);
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [latestHotSeat]);

  // ─── SUSPICION THERMOMETER SCORES ───
  const suspicionScores = useMemo(() => {
    const scores = {};
    messages.filter((m) => m.type === 'reaction').forEach((m) => {
      try {
        const data = JSON.parse(m.content);
        if (!data.targetId) return;
        if (!scores[data.targetId]) {
          scores[data.targetId] = { sus: 0, lie: 0, trust: 0, total: 0 };
        }
        if (data.reaction === 'sus') {
          scores[data.targetId].sus += 1;
          scores[data.targetId].total += 1;
        } else if (data.reaction === 'lie') {
          scores[data.targetId].lie += 1;
          scores[data.targetId].total += 1;
        } else if (data.reaction === 'trust') {
          scores[data.targetId].trust += 1;
          scores[data.targetId].total -= 1;
        }
      } catch {}
    });
    return scores;
  }, [messages]);

  const getSuspicionMeta = (targetId) => {
    const net = suspicionScores[targetId]?.total || 0;
    if (net <= 0) return { label: '🟢 Clean', badgeClass: s.susClean, score: net };
    if (net <= 2) return { label: '🟡 Questionable', badgeClass: s.susQuestionable, score: net };
    return { label: '🔴 Prime Suspect', badgeClass: s.susHigh, score: net };
  };

  const handleReactToSuspect = async (targetId, reaction) => {
    if (!room || !player?.id) return;
    try {
      await fetch('/api/game/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          playerId: player.id,
          sender: player.name,
          targetId,
          reaction,
        }),
      });
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleOpenHotSeat = (presetTargetId) => {
    const otherPlayers = players.filter((p) => p.id !== player?.id);
    const initialId = presetTargetId || (otherPlayers.length > 0 ? otherPlayers[0].id : '');
    setHotSeatTargetId(initialId);
    setHotSeatReason('');
    setShowHotSeatModal(true);
  };

  const handleTriggerHotSeat = async (e) => {
    e.preventDefault();
    if (!hotSeatTargetId || submittingHotSeat || !room) return;
    setSubmittingHotSeat(true);
    try {
      const res = await fetch('/api/game/ability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          playerId: player.id,
          targetSuspectId: hotSeatTargetId,
          abilityType: 'hotseat',
          reason: hotSeatReason.trim() || 'Explain your whereabouts at the time of the murder!',
          round: room.current_round || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to challenge suspect.');
      setShowHotSeatModal(false);
      setHotSeatReason('');
    } catch (err) {
      console.error('Hot Seat error:', err);
      alert(err.message || 'Could not place suspect on the Hot Seat.');
    } finally {
      setSubmittingHotSeat(false);
    }
  };

  const handleOpenDetectiveScan = (presetTargetId) => {
    const otherPlayers = players.filter((p) => p.id !== player?.id);
    const initialId = presetTargetId || (otherPlayers.length > 0 ? otherPlayers[0].id : '');
    setScanTargetId(initialId);
    setShowScanModal(true);
  };

  const handleRunDetectiveScan = async (e) => {
    e.preventDefault();
    if (!scanTargetId || scanning || !room) return;
    setScanning(true);
    try {
      const res = await fetch('/api/game/ability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          playerId: player.id,
          targetSuspectId: scanTargetId,
          abilityType: 'detective_scan',
          round: room.current_round || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed.');
      setScanResult(data.scanResult);
      setScanLogs((prev) => [data.scanResult, ...prev]);
    } catch (err) {
      console.error('Scan error:', err);
      alert(err.message || 'Forensic scan failed.');
    } finally {
      setScanning(false);
    }
  };

  // Auto-advance countdown state
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(null);
  const autoAdvanceTimerRef = useRef(null);

  // Clear auto-advance countdown if round changes or room status changes
  useEffect(() => {
    setAutoAdvanceSeconds(null);
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, [room?.current_round, room?.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Advance round handler
  const handleAdvanceRound = async () => {
    if (!room || advancing) return;
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvanceSeconds(null);
    setAdvancing(true);

    try {
      const res = await fetch('/api/game/clue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          roomCode,
          currentRound: room.current_round || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to advance round.');
      }

      if (data.finished || data.status === GAME_STATUS.VOTING) {
        router.push(`/vote/${roomCode}`);
      } else {
        refreshState();
      }
    } catch (err) {
      console.error('Error advancing round:', err);
      alert(err.message || 'Failed to advance round.');
    } finally {
      setAdvancing(false);
    }
  };

  // Triggered when Timer hits 00:00
  const handleRoundTimeUp = () => {
    if (autoAdvanceTimerRef.current || advancing) return;

    let countdown = 5;
    setAutoAdvanceSeconds(countdown);

    autoAdvanceTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
        setAutoAdvanceSeconds(null);

        // ONLY host triggers advance, preventing race conditions between players
        if (player?.isHost) {
          handleAdvanceRound();
        }
      } else {
        setAutoAdvanceSeconds(countdown);
      }
    }, 1000);
  };

  // Send discussion message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const clean = chatText.trim();
    if (!clean || sendingChat || !room) return;

    setSendingChat(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          playerId: player?.id,
          sender: player?.name || 'Anonymous',
          content: clean,
          round: room.current_round || 1,
          type: chatMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      setChatText('');
      if (chatMode === 'defense' || chatMode === 'alibi' || chatMode === 'rumor') {
        setChatMode('chat');
      }
    } catch (err) {
      console.error('Error sending chat:', err);
    } finally {
      setSendingChat(false);
    }
  };

  // Open accusation modal
  const handleOpenAccuse = () => {
    const otherPlayers = players.filter((p) => p.id !== player?.id);
    if (otherPlayers.length > 0 && !accusedId) {
      setAccusedId(otherPlayers[0].id);
    }
    setAccuseError('');
    setShowAccuseModal(true);
  };

  // Submit formal accusation
  const handleSubmitAccusation = async (e) => {
    e.preventDefault();
    if (!accusedId || !accuseReason.trim() || submittingAccusation) return;

    setSubmittingAccusation(true);
    setAccuseError('');

    try {
      const res = await fetch('/api/game/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          accuserId: player?.id,
          accusedId,
          reason: accuseReason.trim(),
          round: room.current_round || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit accusation.');
      }

      setAccuseReason('');
      setShowAccuseModal(false);
    } catch (err) {
      console.error('Error submitting accusation:', err);
      setAccuseError(err.message || 'Failed to submit accusation.');
    } finally {
      setSubmittingAccusation(false);
    }
  };


  if (loading) {
    return (
      <div className={s.page}>
        <LoadingSpinner label="Accessing classified crime scene dossier..." />
      </div>
    );
  }


  if (error || !room) {
    return (
      <div className={s.page}>
        <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--neon-red)', marginBottom: '1rem' }}>Investigation Offline</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error || 'Could not load the murder mystery room.'}
          </p>
          <Link href="/" className={s.leaveBtn} style={{ background: 'var(--border-glass)' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const scenario = room.scenario || {};

  // Find player's assigned role from database currentPlayer or fallback to room.scenario.playerRoles
  const assignedFromScenario = Array.isArray(scenario?.playerRoles)
    ? scenario.playerRoles.find(
        (r) =>
          (r.playerId && r.playerId === player?.id) ||
          (r.playerName && player?.name && r.playerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      )
    : null;

  const currentRole = currentPlayer?.role || assignedFromScenario?.role || ROLES.SUSPECT;
  const secretInfo = currentPlayer?.secret_info || assignedFromScenario?.secretInfo || 'Await your confidential briefing...';
  const isHost = player?.isHost && (player?.roomId === room?.id || player?.roomCode === roomCode);

  const currentRound = room.current_round || 1;
  const maxRounds = room.max_rounds || 3;
  const isFinalRound = currentRound >= maxRounds;

  // Deduplicate clues by round so duplicate database records never show more than 1 clue per round
  const uniqueClues = [];
  const seenRounds = new Set();
  for (const c of clues) {
    if (!seenRounds.has(c.round)) {
      seenRounds.add(c.round);
      uniqueClues.push(c);
    }
  }

  // Authoritative round start timestamp:
  // 1) From room.scenario (stored on server)
  // 2) From the current round clue's created_at
  // 3) From localStorage cache
  const getRoundStartTime = () => {
    const key = `round_${currentRound}_started_at`;
    if (scenario[key]) return scenario[key];
    if (currentRound === 1 && scenario.current_round_started_at) {
      return scenario.current_round_started_at;
    }

    const clueForRound = clues.find((c) => c.round === currentRound);
    if (clueForRound?.created_at) return clueForRound.created_at;

    if (typeof window !== 'undefined') {
      const storageKey = `ht_r_start_${roomCode}_r${currentRound}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(saved);
      const now = Date.now();
      localStorage.setItem(storageKey, String(now));
      return now;
    }

    return null;
  };

  const roundStartedAt = getRoundStartTime();

  // Role details with case-insensitive normalization
  const getRoleBadge = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('kill')) {
      return {
        title: 'The Killer',
        icon: '🩸',
        cardClass: s.roleCardKiller,
        titleClass: s.roleKiller,
      };
    }
    if (r.includes('detec')) {
      return {
        title: 'The Detective',
        icon: '🔍',
        cardClass: s.roleCardDetective,
        titleClass: s.roleDetective,
      };
    }
    if (r.includes('witn')) {
      return {
        title: 'The Witness',
        icon: '👁️',
        cardClass: s.roleCardWitness,
        titleClass: s.roleWitness,
      };
    }
    return {
      title: 'Prime Suspect',
      icon: '🎭',
      cardClass: s.roleCardSuspect,
      titleClass: s.roleSuspect,
    };
  };

  const roleMeta = getRoleBadge(currentRole);

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
        <div className={s.navLeft}>
          <span className={s.codeBadge}>ROOM {roomCode}</span>
          <span className={s.roundBadge}>ROUND {currentRound} OF {maxRounds}</span>
        </div>
        <Timer
          totalSeconds={TIMER_CONFIG.ROUND_DURATION_SECONDS}
          startedAt={roundStartedAt}
          label={`ROUND ${currentRound}`}
          resetTrigger={currentRound}
          onTimeUp={handleRoundTimeUp}
          showExpiredBanner={false}
        />
        <button
          type="button"
          onClick={handleLeaveGame}
          className={s.leaveBtn}
        >
          Exit
        </button>
      </header>

      {/* Auto-Advance Emergency Banner */}
      <AnimatePresence>
        {autoAdvanceSeconds !== null && (
          <motion.div
            className={s.autoAdvanceBanner}
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <div className={s.autoAdvanceGlow} />
            <span className={s.autoAdvanceIcon}>🚨</span>
            <div className={s.autoAdvanceText}>
              <div className={s.autoAdvanceTitle}>
                {isFinalRound
                  ? 'ROUND TIME IS UP!'
                  : `ROUND ${currentRound} TIME IS UP!`}
              </div>
              <div className={s.autoAdvanceSub}>
                {isFinalRound
                  ? `Time's up! Moving to the final vote in ${autoAdvanceSeconds}s...`
                  : `Time's up! Revealing Round ${currentRound + 1} clue in ${autoAdvanceSeconds}s...`}
              </div>
            </div>
            <div className={s.autoAdvanceCountdownPill}>
              {autoAdvanceSeconds}s
            </div>
            {isHost && (
              <button
                type="button"
                className={s.btnAdvanceNow}
                onClick={handleAdvanceRound}
                disabled={advancing}
              >
                {advancing ? 'Loading...' : 'Next Round Now ⚡'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Dashboard */}
      <main className={s.dashboard}>
        {/* Left Column: Role & AI Narrator */}
        <div className={s.leftCol}>
          {/* Scenario Overview */}
          <motion.div
            className={s.scenarioHeader}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className={s.settingTag}>{scenario.setting || 'Classified Location'}</span>
            <h1 className={s.mysteryTitle}>{scenario.title || 'Murder Mystery Investigation'}</h1>
            {scenario.victim && (
              <div className={s.victimBar}>
                <span className={s.victimIcon}>💀</span>
                <span>Victim: <strong>{scenario.victim}</strong></span>
              </div>
            )}
          </motion.div>

          {/* Secret Role Reveal Card */}
          <motion.div
            className={`${s.roleCard} ${roleMeta.cardClass}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className={s.roleHeader}>
              <span className={s.roleTag}>Top Secret Dossier</span>
              <button
                type="button"
                className={s.peekToggle}
                onClick={() => setHideSecret(!hideSecret)}
              >
                <span>{hideSecret ? '👁️ Show' : '🙈 Hide'}</span>
                <span>{hideSecret ? 'Peek' : 'Shield'}</span>
              </button>
            </div>

            <div className={s.roleReveal}>
              <RoleModelCanvas role={currentRole} size="large" hidden={hideSecret} />
              <div className={s.roleTitleGroup}>
                <span className={s.roleSubtitle}>Your Secret Identity</span>
                <span className={`${s.roleTitle} ${roleMeta.titleClass}`}>
                  {roleMeta.title}
                </span>
              </div>
            </div>

            <div
              className={`${s.secretBox} ${hideSecret ? s.hiddenSecret : ''}`}
              onClick={() => hideSecret && setHideSecret(false)}
            >
              {hideSecret ? (
                <span style={{ color: 'var(--text-muted)' }}>Tap to reveal your private briefing...</span>
              ) : (
                secretInfo
              )}
            </div>
          </motion.div>

          {/* Role Special Power Action Card */}
          {currentRole.toLowerCase().includes('detec') && (
            <motion.div
              className={s.roleAbilityCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={s.roleAbilityHeader}>
                <span className={s.roleAbilityBadge}>🔍 Detective Forensic Power</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontFamily: 'var(--f-mono)' }}>
                  Active Tool
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Test any suspect’s physical traces and alibi against the hidden crime scene truth.
              </p>
              <button
                type="button"
                className={s.btnAbilityAction}
                onClick={() => handleOpenDetectiveScan()}
              >
                <span>🔬</span>
                <span>Run Forensic Scan on Suspect</span>
              </button>

              {scanLogs.length > 0 && (
                <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid var(--neon-cyan)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>Latest Scan ({scanLogs[0].targetName}):</div>
                  <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.2rem' }}>{scanLogs[0].finding}</div>
                </div>
              )}
            </motion.div>
          )}

          {currentRole.toLowerCase().includes('witn') && (
            <motion.div
              className={s.roleAbilityCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}
            >
              <div className={s.roleAbilityHeader}>
                <span className={s.roleAbilityBadge} style={{ color: '#c084fc' }}>👁️ Witness Superpower</span>
                <span style={{ fontSize: '0.72rem', color: '#c084fc', fontFamily: 'var(--f-mono)' }}>Anonymous</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                You can send confidential whistleblower tips to the room without revealing your identity!
              </p>
              <button
                type="button"
                className={s.btnAbilityAction}
                style={{ borderColor: '#a855f7', background: 'rgba(168, 85, 247, 0.2)' }}
                onClick={() => setChatMode(chatMode === 'anonymous' ? 'chat' : 'anonymous')}
              >
                <span>🕶️</span>
                <span>{chatMode === 'anonymous' ? '✓ Anonymous Tip Active' : 'Send Anonymous Tip 🕶️'}</span>
              </button>
            </motion.div>
          )}

          {currentRole.toLowerCase().includes('kill') && (
            <motion.div
              className={s.roleAbilityCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              <div className={s.roleAbilityHeader}>
                <span className={s.roleAbilityBadge} style={{ color: '#f87171' }}>🩸 Killer Mind Games</span>
                <span style={{ fontSize: '0.72rem', color: '#f87171', fontFamily: 'var(--f-mono)' }}>Misdirection</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Plant deceptive rumors in the chat feed to deflect suspicion onto an innocent friend!
              </p>
              <button
                type="button"
                className={s.btnAbilityAction}
                style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.2)' }}
                onClick={() => setChatMode(chatMode === 'rumor' ? 'chat' : 'rumor')}
              >
                <span>🎭</span>
                <span>{chatMode === 'rumor' ? '✓ Plant Rumor Active' : 'Plant Deceptive Rumor 🎭'}</span>
              </button>
            </motion.div>
          )}

          {!currentRole.toLowerCase().includes('kill') && !currentRole.toLowerCase().includes('detec') && !currentRole.toLowerCase().includes('witn') && (
            <motion.div
              className={s.roleAbilityCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
            >
              <div className={s.roleAbilityHeader}>
                <span className={s.roleAbilityBadge} style={{ color: '#fbbf24' }}>🛡️ Suspect Defense</span>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontFamily: 'var(--f-mono)' }}>Self-Preservation</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Highlight your innocence with a formal verified alibi statement in the discussion thread.
              </p>
              <button
                type="button"
                className={s.btnAbilityAction}
                style={{ borderColor: '#eab308', background: 'rgba(234, 179, 8, 0.2)' }}
                onClick={() => setChatMode(chatMode === 'alibi' ? 'chat' : 'alibi')}
              >
                <span>🛡️</span>
                <span>{chatMode === 'alibi' ? '✓ Alibi Mode Active' : 'Declare Verified Alibi 🛡️'}</span>
              </button>
            </motion.div>
          )}

          {/* Host Round Controls */}
          {isHost && (
            <motion.div
              className={s.hostControlBox}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={s.hostLabel}>
                <span>👑 Host Authority</span>
                <span>• Round {currentRound}/{maxRounds}</span>
              </div>
              <button
                onClick={handleAdvanceRound}
                disabled={advancing}
                className={`${s.btnAdvance} ${isFinalRound ? s.btnVote : ''}`}
                id="btn-advance-round"
              >
                {advancing ? (
                  <>
                    <div className={s.spinner} />
                    <span>Analyzing Crime Scene...</span>
                  </>
                ) : isFinalRound ? (
                  <>
                    <span>🗳️</span>
                    <span>Conclude Investigation & Vote</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Reveal Next Clue (Round {currentRound + 1})</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* AI Narrator Monologue */}
          <NarratorBubble
            message={scenario.intro}
            round={currentRound}
          />
        </div>

        {/* Right Column: Evidence, Chat Discussion & Suspects Roster */}
        <div className={s.rightCol}>
          {/* Active Clues */}
          <motion.div
            className={s.cluesContainer}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className={s.sectionTitle}>
              <span>📁 Revealed Evidence</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--f-mono)', color: 'var(--neon-cyan)' }}>
                {uniqueClues.length} Discovered
              </span>
            </div>

            <div className={s.cluesList}>
              <AnimatePresence>
                {uniqueClues.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Searching crime scene for initial clues...
                  </div>
                ) : (
                  uniqueClues.map((c, idx) => (
                    <ClueCard key={c.id || idx} clue={c} index={idx} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Live Interrogation & Discussion Chat */}
          <motion.div
            className={s.chatContainer}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className={s.sectionTitle}>
              <span>💬 Interrogation & Discussion</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={s.btnHotSeatTrigger}
                  onClick={() => handleOpenHotSeat()}
                  title="Challenge a suspect to 30s rapid defense on the Hot Seat"
                >
                  🔥 Hot Seat
                </button>
                <button
                  type="button"
                  className={s.btnAccuseTrigger}
                  onClick={handleOpenAccuse}
                >
                  🚨 Point Finger
                </button>
              </div>
            </div>

            {/* Live Hot Seat Active Banner */}
            {latestHotSeat && hotSeatSecondsLeft > 0 && (
              <motion.div
                className={s.hotSeatBanner}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className={s.hotSeatInfo}>
                  <span className={s.hotSeatTitle}>
                    <span>🔥 HOT SEAT CHALLENGE!</span>
                  </span>
                  <span className={s.hotSeatSub}>
                    {latestHotSeat.content}
                  </span>
                </div>
                <div className={s.hotSeatCountdown}>
                  {hotSeatSecondsLeft}s
                </div>
              </motion.div>
            )}

            <div ref={chatMessagesRef} className={s.chatFeed}>
              {messages.filter((m) => m.type !== 'reaction').length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
                  No messages yet. Ask someone where they were or defend yourself!
                </div>
              ) : (
                messages.filter((m) => m.type !== 'reaction').map((m) => {
                  const isNarrator = m.type === 'narrator' || m.sender === 'narrator';
                  const isAccusation = m.type === 'accusation';
                  const isHotSeat = m.type === 'hotseat';
                  const isDefense = m.type === 'defense';
                  const isAnonymous = m.type === 'anonymous';
                  const isRumor = m.type === 'rumor';
                  const isAlibi = m.type === 'alibi';
                  const isSystem = m.type === 'system';
                  const isMe = m.player_id === player?.id;

                  let bubbleClass = s.bubbleOther;
                  if (isAccusation) bubbleClass = s.bubbleAccusation;
                  else if (isHotSeat) bubbleClass = s.bubbleHotSeat;
                  else if (isDefense) bubbleClass = s.bubbleDefense;
                  else if (isAnonymous) bubbleClass = s.bubbleAnonymous;
                  else if (isRumor) bubbleClass = s.bubbleRumor;
                  else if (isAlibi) bubbleClass = s.bubbleAlibi;
                  else if (isSystem) bubbleClass = s.bubbleSystem;
                  else if (isNarrator) bubbleClass = s.bubbleNarrator;
                  else if (isMe) bubbleClass = s.bubbleMe;

                  return (
                    <div
                      key={m.id}
                      className={`${s.msgRow} ${
                        isAccusation || isNarrator || isHotSeat || isSystem
                          ? s.msgRowNarrator
                          : isMe
                          ? s.msgRowMe
                          : s.msgRowOther
                      }`}
                    >
                      {!isNarrator && !isAccusation && !isHotSeat && !isSystem && (
                        <span className={s.msgSender}>
                          {isMe ? 'You' : m.sender}
                        </span>
                      )}
                      <div className={`${s.msgBubble} ${bubbleClass}`}>
                        {isNarrator && <strong>🎙️ AI Narrator: </strong>}
                        {isAnonymous && <strong>🕶️ ANONYMOUS TIP: </strong>}
                        {isRumor && <strong>🎭 PLANTED RUMOR: </strong>}
                        {isAlibi && <strong>🛡️ VERIFIED ALIBI: </strong>}
                        {isDefense && <strong>🛡️ PLEA OF DEFENSE: </strong>}
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Active Special Ability indicator pill */}
            {chatMode !== 'chat' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.65rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--f-mono)' }}>
                <span style={{ color: chatMode === 'anonymous' ? '#c084fc' : chatMode === 'rumor' ? '#f87171' : '#fbbf24' }}>
                  Active Mode: <strong>{chatMode === 'anonymous' ? '🕶️ Anonymous Tip' : chatMode === 'rumor' ? '🎭 Plant Rumor' : '🛡️ Verified Alibi'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setChatMode('chat')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ✕ Normal Chat
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className={s.chatInputForm}>
              <input
                type="text"
                className={s.chatInput}
                placeholder={
                  chatMode === 'anonymous'
                    ? 'Type an anonymous whistleblower tip...'
                    : chatMode === 'rumor'
                    ? 'Plant a deceptive rumor into the discussion...'
                    : chatMode === 'alibi'
                    ? 'Declare your verified alibi...'
                    : 'Ask someone where they were, or defend yourself...'
                }
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={300}
                disabled={sendingChat}
              />
              <button
                type="submit"
                className={s.btnSend}
                disabled={sendingChat || !chatText.trim()}
              >
                Send
              </button>
            </form>
          </motion.div>

          {/* Suspects Roster with Live Suspicion Thermometer & Quick Reactions */}
          <motion.div
            className={s.rosterContainer}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className={s.sectionTitle}>
              <span>👥 Suspects Present ({players.length})</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--f-mono)' }}>
                Live Suspicion Meter
              </span>
            </div>

            <div className={s.suspectListGame}>
              {players.map((p) => {
                const isMe = p.id === player?.id;
                const susMeta = getSuspicionMeta(p.id);

                return (
                  <div key={p.id} className={s.suspectRowCard}>
                    <div className={s.suspectRowLeft}>
                      <div className={s.suspectAvatarSmall}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={s.suspectNameMeta}>
                        <div className={s.suspectNameText}>
                          {p.name} {p.is_host && '👑'} {isMe && <span style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                        </div>
                        <div className={`${s.susMeterPill} ${susMeta.badgeClass}`}>
                          <span>{susMeta.label}</span>
                          {susMeta.score !== 0 && (
                            <span style={{ opacity: 0.8 }}>({susMeta.score > 0 ? `+${susMeta.score}` : susMeta.score})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isMe && (
                      <div className={s.reactionGroup}>
                        <button
                          type="button"
                          className={s.btnReactIcon}
                          onClick={() => handleReactToSuspect(p.id, 'sus')}
                          title="Flag as Suspicious (+1 Sus)"
                        >
                          🚨
                        </button>
                        <button
                          type="button"
                          className={s.btnReactIcon}
                          onClick={() => handleReactToSuspect(p.id, 'lie')}
                          title="Call out Lie (+1 Sus)"
                        >
                          🤥
                        </button>
                        <button
                          type="button"
                          className={s.btnReactIcon}
                          onClick={() => handleReactToSuspect(p.id, 'trust')}
                          title="Vouch / Trust (-1 Sus)"
                        >
                          🤝
                        </button>
                        <button
                          type="button"
                          className={s.btnRowHotSeat}
                          onClick={() => handleOpenHotSeat(p.id)}
                          title="Put on Hot Seat"
                        >
                          🔥
                        </button>
                        {currentRole.toLowerCase().includes('detec') && (
                          <button
                            type="button"
                            className={s.btnRowHotSeat}
                            style={{ background: 'rgba(34,211,238,0.15)', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                            onClick={() => handleOpenDetectiveScan(p.id)}
                            title="Forensic Scan"
                          >
                            🔬
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // Nothing Is What It Seems.
      </footer>

      {/* Accusation Modal */}
      {showAccuseModal && (
        <div
          className={s.modalOverlay}
          onClick={() => !submittingAccusation && setShowAccuseModal(false)}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>🚨 Point the Finger</h3>
              <button
                type="button"
                className={s.modalClose}
                onClick={() => setShowAccuseModal(false)}
                disabled={submittingAccusation}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAccusation}>
              <div className={s.formGroup} style={{ marginBottom: '1rem' }}>
                <label className={s.formLabel}>Who are you accusing?</label>
                <select
                  className={s.accuseSelect}
                  value={accusedId}
                  onChange={(e) => setAccusedId(e.target.value)}
                  disabled={submittingAccusation}
                >
                  {players
                    .filter((p) => p.id !== player?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={s.formGroup} style={{ marginBottom: '1rem' }}>
                <label className={s.formLabel}>Why are you accusing them?</label>
                <textarea
                  className={s.accuseTextarea}
                  placeholder="Tell the room why you are accusing them (e.g. conflicting alibi, suspicious reaction, or a clue pointing to them)..."
                  rows={3}
                  value={accuseReason}
                  onChange={(e) => setAccuseReason(e.target.value)}
                  disabled={submittingAccusation}
                  maxLength={250}
                  required
                />
              </div>

              {accuseError && (
                <div style={{ color: 'var(--neon-red)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  {accuseError}
                </div>
              )}

              <div className={s.modalActions}>
                <button
                  type="button"
                  className={s.btnCancel}
                  onClick={() => setShowAccuseModal(false)}
                  disabled={submittingAccusation}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={s.btnSubmitAccuse}
                  disabled={submittingAccusation || !accuseReason.trim() || !accusedId}
                >
                  {submittingAccusation ? 'Accusing...' : 'Declare Accusation 🚨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hot Seat Challenge Modal */}
      {showHotSeatModal && (
        <div
          className={s.modalOverlay}
          onClick={() => !submittingHotSeat && setShowHotSeatModal(false)}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()} style={{ borderColor: '#f59e0b' }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle} style={{ color: '#fbbf24' }}>🔥 Challenge to Hot Seat</h3>
              <button
                type="button"
                className={s.modalClose}
                onClick={() => setShowHotSeatModal(false)}
                disabled={submittingHotSeat}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerHotSeat}>
              <div className={s.formGroup} style={{ marginBottom: '1rem' }}>
                <label className={s.formLabel}>Put on the Stand:</label>
                <select
                  className={s.accuseSelect}
                  value={hotSeatTargetId}
                  onChange={(e) => setHotSeatTargetId(e.target.value)}
                  disabled={submittingHotSeat}
                >
                  {players
                    .filter((p) => p.id !== player?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={s.formGroup} style={{ marginBottom: '1rem' }}>
                <label className={s.formLabel}>What must they answer for?</label>
                <textarea
                  className={s.accuseTextarea}
                  placeholder="e.g. You claimed you were sleeping, but the clue says footsteps were heard near the gallery! Explain yourself!"
                  rows={3}
                  value={hotSeatReason}
                  onChange={(e) => setHotSeatReason(e.target.value)}
                  disabled={submittingHotSeat}
                  maxLength={250}
                  required
                />
              </div>

              <div className={s.modalActions}>
                <button
                  type="button"
                  className={s.btnCancel}
                  onClick={() => setShowHotSeatModal(false)}
                  disabled={submittingHotSeat}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={s.btnSubmitAccuse}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}
                  disabled={submittingHotSeat || !hotSeatReason.trim() || !hotSeatTargetId}
                >
                  {submittingHotSeat ? 'Calling Out...' : 'Start 30s Hot Seat 🔥'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detective Forensic Scan Modal */}
      {showScanModal && (
        <div
          className={s.modalOverlay}
          onClick={() => !scanning && setShowScanModal(false)}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()} style={{ borderColor: 'var(--neon-cyan)' }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle} style={{ color: 'var(--neon-cyan)' }}>🔬 Forensic Truth Probe</h3>
              <button
                type="button"
                className={s.modalClose}
                onClick={() => setShowScanModal(false)}
                disabled={scanning}
              >
                ✕
              </button>
            </div>

            {scanResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(34,211,238,0.1)', border: '1px solid var(--neon-cyan)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'var(--f-mono)', color: 'var(--neon-cyan)', marginBottom: '0.4rem' }}>
                    CONFIDENTIAL FORENSIC DOSSIER // {scanResult.targetName}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
                    {scanResult.finding}
                  </div>
                  <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', fontFamily: 'var(--f-mono)', color: scanResult.isSuspicious ? 'var(--neon-red)' : '#34d399' }}>
                    ANALYSIS STATUS: {scanResult.confidence}
                  </div>
                </div>

                <div className={s.modalActions}>
                  <button
                    type="button"
                    className={s.btnSubmitAccuse}
                    style={{ background: 'var(--neon-cyan)', color: '#000' }}
                    onClick={() => {
                      setScanResult(null);
                      setShowScanModal(false);
                    }}
                  >
                    Got It (Keep Confidential)
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRunDetectiveScan}>
                <div className={s.formGroup} style={{ marginBottom: '1rem' }}>
                  <label className={s.formLabel}>Target Suspect for Forensic Testing:</label>
                  <select
                    className={s.accuseSelect}
                    value={scanTargetId}
                    onChange={(e) => setScanTargetId(e.target.value)}
                    disabled={scanning}
                  >
                    {players
                      .filter((p) => p.id !== player?.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 1rem' }}>
                  The crime lab will cross-reference this suspect's shoes, hands, clothing fibers, and timeline against the primary crime scene evidence. Only you will see the full forensic report.
                </p>

                <div className={s.modalActions}>
                  <button
                    type="button"
                    className={s.btnCancel}
                    onClick={() => setShowScanModal(false)}
                    disabled={scanning}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={s.btnSubmitAccuse}
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                    disabled={scanning || !scanTargetId}
                  >
                    {scanning ? 'Analyzing Traces...' : 'Run Forensic Scan 🔬'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


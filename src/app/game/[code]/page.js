'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameState } from '@/hooks/useGameState';
import Timer from '@/components/Timer';
import LoadingSpinner from '@/components/LoadingSpinner';
import AgentFigure from '@/components/AgentFigure';
import HowToPlayModal from '@/components/HowToPlayModal';
import CaseWritingScreen from '@/components/CaseWritingScreen';
import { ROLES, GAME_STATUS, TIMER_CONFIG } from '@/lib/constants';
import s from './page.module.css';

export default function GamePage({ params }) {
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();
  const { player, clearPlayer } = usePlayer();
  const { room, currentPlayer, players, clues, messages, loading, error, refreshState, setRoom, setClues } =
    useGameState(roomCode, player?.id);

  const [hideSecret, setHideSecret] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [accusedId, setAccusedId] = useState('');
  const [accuseReason, setAccuseReason] = useState('');
  const [submittingAccusation, setSubmittingAccusation] = useState(false);
  const [accuseError, setAccuseError] = useState('');

  // Interactive Flow Modals matching Web.dc.html
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleHold, setRoleHold] = useState(0);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [reactionData, setReactionData] = useState(null);
  const holdIntervalRef = useRef(null);

  const handleHoldStart = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (roleRevealed) return;
    setIsHolding(true);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      setRoleHold((prev) => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
          setRoleRevealed(true);
          setIsHolding(false);
          return 100;
        }
        return prev + 6;
      });
    }, 45);
  };

  const handleHoldEnd = () => {
    if (roleRevealed) return;
    setIsHolding(false);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setRoleHold(0);
  };

  const chatMessagesRef = useRef(null);

  // Guarantee game screen always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

    if (!player?.id || (player?.roomCode && player.roomCode !== roomCode)) {
      router.push(`/join?code=${roomCode}`, { scroll: true });
    }
  }, [loading, room, room?.status, roomCode, player, router]);

  // Auto-scroll chat box when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-advance countdown state
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(null);
  const autoAdvanceTimerRef = useRef(null);

  useEffect(() => {
    setAutoAdvanceSeconds(null);
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, [room?.current_round, room?.status]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleLeaveGame = (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      'Are you sure you want to exit the active investigation? Your secret role and progress will be abandoned.'
    );
    if (!confirmed) return;
    clearPlayer();
    router.push('/');
  };

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

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(
          `Server returned an error (${res.status} ${res.statusText || 'Internal Server Error'}). If this was caused by a build/hot-reload mismatch, please restart 'npm run dev'.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to advance round.');
      }

      if (data.finished || data.status === GAME_STATUS.VOTING) {
        router.push(`/vote/${roomCode}`);
      } else {
        if (data.room) setRoom(data.room);
        if (data.clue) {
          setClues((prev) =>
            prev.some((c) => c.id === data.clue.id || c.round === data.clue.round)
              ? prev
              : [...prev, data.clue]
          );
        }
        if (Array.isArray(data.clues)) {
          setClues(data.clues);
        }
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

        if (player?.isHost) {
          handleAdvanceRound();
        }
      } else {
        setAutoAdvanceSeconds(countdown);
      }
    }, 1000);
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
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
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Failed to send message (Server ${res.status}).`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      setChatText('');
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

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Failed to submit accusation (Server ${res.status}).`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit accusation.');
      }

      const accusedPerson = players.find((p) => p.id === accusedId);
      const cleanReason = accuseReason.trim();
      setReactionData({
        accusedName: accusedPerson?.name?.replace(/\s*\((Bot|Test)\)/gi, '') || 'The Suspect',
        accusedTint: accusedPerson?.is_host ? '#FFC93C' : '#9B6BFF',
        reason: cleanReason,
        narratorText: data.reaction || data.narrator_comment || `A hush falls over the penthouse. All eyes dart toward ${accusedPerson?.name?.replace(/\s*\((Bot|Test)\)/gi, '') || 'the suspect'}. The accusation echoes as the storm rages outside.`,
        round: room.current_round || 1,
      });

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
      <div className={s.page} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#07050A' }}>
        <LoadingSpinner label="Accessing crime scene dossier..." />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#FF2D55', marginBottom: '1rem', fontFamily: 'Unbounded, sans-serif' }}>
            Investigation Offline
          </h2>
          <p style={{ color: '#A49CC4', marginBottom: '1.5rem' }}>
            {error || 'Could not load the murder mystery room.'}
          </p>
          <Link href="/" className="btn glass" style={{ padding: '10px 20px', borderRadius: '12px' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const scenario = room.scenario || {};

  const assignedFromScenario = Array.isArray(scenario?.playerRoles)
    ? scenario.playerRoles.find(
        (r) =>
          (r.playerId && r.playerId === player?.id) ||
          (r.playerName && player?.name && r.playerName.trim().toLowerCase() === player.name.trim().toLowerCase())
      )
    : null;

  const currentRole = currentPlayer?.role || assignedFromScenario?.role || ROLES.SUSPECT;
  const secretInfo = currentPlayer?.secret_info || assignedFromScenario?.secretInfo || 'Await your confidential briefing...';
  const isHost = Boolean(
    currentPlayer?.is_host ||
    player?.isHost ||
    (room?.host_id && (room.host_id === player?.id || room.host_id === currentPlayer?.id))
  );

  const currentRound = room.current_round || 1;
  const maxRounds = room.max_rounds || 3;
  const isFinalRound = currentRound >= maxRounds;

  // Deduplicate clues
  const uniqueClues = [];
  const seenRounds = new Set();
  for (const c of clues) {
    if (!seenRounds.has(c.round)) {
      seenRounds.add(c.round);
      uniqueClues.push(c);
    }
  }

  const latestClue = uniqueClues.find((c) => c.round === currentRound) || uniqueClues[uniqueClues.length - 1] || null;

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

  // Role Meta matching Reference HTML 01_Investigation
  const getRoleInfo = (r) => {
    const roleStr = (r || '').toLowerCase();
    if (roleStr.includes('kill')) {
      return {
        key: 'killer',
        name: 'The Killer',
        color: '#FF2D55',
        roleFrame: 'linear-gradient(160deg, rgba(255,45,85,.85), rgba(255,45,85,.08) 55%, rgba(255,45,85,.3))',
        spot: 'rgba(255,45,85,.35)',
        roleText: 'linear-gradient(90deg, #FF2D55, #FF7A3D)',
        goal: "You are the Killer. Deflect suspicion and survive the lineup.",
      };
    }
    if (roleStr.includes('detec')) {
      return {
        key: 'detective',
        name: 'The Detective',
        color: '#2EE6FF',
        roleFrame: 'linear-gradient(160deg, rgba(46,230,255,.85), rgba(46,230,255,.08) 55%, rgba(46,230,255,.3))',
        spot: 'rgba(46,230,255,.35)',
        roleText: 'linear-gradient(90deg, #2EE6FF, #7B6CFF)',
        goal: 'Expose the contradiction and convince the jury before the vote.',
      };
    }
    if (roleStr.includes('witn')) {
      return {
        key: 'witness',
        name: 'The Witness',
        color: '#FFC93C',
        roleFrame: 'linear-gradient(160deg, rgba(255,201,60,.85), rgba(255,201,60,.08) 55%, rgba(255,201,60,.3))',
        spot: 'rgba(255,201,60,.35)',
        roleText: 'linear-gradient(90deg, #FFC93C, #FF7A3D)',
        goal: 'Share what you saw — at the right moment without getting caught.',
      };
    }
    return {
      key: 'suspect',
      name: 'The Suspect',
      color: '#B76CFF',
      roleFrame: 'linear-gradient(160deg, rgba(183,108,255,.85), rgba(183,108,255,.08) 55%, rgba(183,108,255,.3))',
      spot: 'rgba(183,108,255,.35)',
      roleText: 'linear-gradient(90deg, #B76CFF, #FF6BB5)',
      goal: 'You look guilty, but you are innocent. Defend your alibi.',
    };
  };

  const myRoleInfo = getRoleInfo(currentRole);

  const getWhatToDoText = () => {
    if (room?.status === GAME_STATUS.VOTING || (isFinalRound && autoAdvanceSeconds !== null)) {
      return 'Vote for the killer. Head straight to the lineup wall.';
    }
    if (showAccuseModal) {
      return 'Pick who you think did it and state your accusation.';
    }
    if (currentRound >= 3) {
      return 'Final clue is out. Cross-examine the contradictions and prepare to vote.';
    }
    if (currentRound === 2) {
      return 'New clue is out. Compare stories: whose alibi has holes?';
    }
    return 'Read your private intel. Question everyone where they were at 11:35 PM.';
  };

  // Phase Stepper logic
  let activePhaseIdx = 0;
  if (room?.status === GAME_STATUS.VOTING || (isFinalRound && autoAdvanceSeconds !== null)) {
    activePhaseIdx = 3; // Vote
  } else if (showAccuseModal || currentRound >= 3) {
    activePhaseIdx = 2; // Accuse
  } else if (currentRound === 2) {
    activePhaseIdx = 1; // Discuss
  } else {
    activePhaseIdx = 0; // Clue
  }

  const phaseLabels = ['Clue', 'Discuss', 'Accuse', 'Vote'];
  const phases = phaseLabels.map((label, i) => {
    const on = i === activePhaseIdx;
    const done = i < activePhaseIdx;
    return {
      n: done ? '✓' : i + 1,
      label,
      bg: on ? 'linear-gradient(135deg, rgba(255,201,60,.25), rgba(255,138,61,.15))' : 'transparent',
      border: on ? 'rgba(255,201,60,.8)' : done ? 'rgba(46,230,255,.45)' : 'rgba(176,156,255,.18)',
      color: on ? '#FFD66B' : done ? '#2EE6FF' : '#7A729C',
      glow: on ? '0 0 22px -2px rgba(255,201,60,.5)' : 'none',
      dotBg: on ? 'linear-gradient(135deg, #FFC93C, #FF8A3D)' : done ? 'rgba(46,230,255,.15)' : 'rgba(176,156,255,.1)',
      dotColor: on ? '#1A0F00' : done ? '#2EE6FF' : '#A49CC4',
      line: i < 3,
      lineColor: done ? '#2EE6FF' : 'rgba(176,156,255,.18)',
    };
  });

  // Dynamic Evidence board suspects mapping — fits 3, 4, 6, 8, 10 players
  const BOARD_WASHES = [
    '#4A2380', '#5A4210', '#0E4D6B', '#5A1440',
    '#1B4332', '#7F2982', '#3D348B', '#B23A48',
    '#2C6E49', '#7D4F50'
  ];

  const TILTS = [-3, 2.5, -2, 3, -3.5, 2, -1.5, 3.5, -2.5, 2];

  const boardSuspects = players.map((p, idx) => {
    const isMe = p.id === player?.id;
    const isBot = Boolean(p.is_bot || p.name?.includes('(Bot)') || p.name?.includes('(Test)'));
    const cleanName = p.name ? p.name.replace(/\s*\((Bot|Test)\)/gi, '') : 'Player';

    let tag = '';
    let tagColor = '#A49CC4';
    if (isMe) {
      tag = 'YOU';
      tagColor = '#2EE6FF';
    } else if (p.is_host) {
      tag = 'HOST';
      tagColor = '#FFC93C';
    } else if (isBot) {
      tag = 'BOT';
      tagColor = '#B76CFF';
    }

    const wash = BOARD_WASHES[idx % BOARD_WASHES.length];
    const tilt = TILTS[idx % TILTS.length];

    return {
      ...p,
      cleanName,
      tag,
      tagColor,
      isMe,
      role: isMe ? (hideSecret ? 'unknown' : myRoleInfo.key) : 'unknown',
      tint: isMe ? myRoleInfo.color : '#A49CC4',
      wash,
      tilt,
    };
  });

  const isMultiPlayer = boardSuspects.length > 4;
  const halfSuspects = Math.ceil(boardSuspects.length / 2);
  const leftSuspects = boardSuspects.slice(0, halfSuspects);
  const rightSuspects = boardSuspects.slice(halfSuspects);

  // Dynamic Clue Parser — Extracts live case clue title & description
  const getActiveClue = () => {
    const clueForRound = uniqueClues.find((c) => c.round === currentRound);
    const fallbackClue = uniqueClues[uniqueClues.length - 1] || null;
    const target = clueForRound || fallbackClue;

    if (target) {
      const raw = target.content || '';
      const match = raw.match(/^(?:\[ROUND\s*\d+\]\s*)?([^:]+):\s*([\s\S]+)$/i);
      if (match) {
        return {
          title: match[1].trim(),
          description: match[2].trim(),
          round: target.round || currentRound,
        };
      }

      if (target.title) {
        return {
          title: target.title,
          description: target.description || target.content || '',
          round: target.round || currentRound,
        };
      }

      if (raw) {
        return {
          title: target.round === 1 && scenario?.initialClue?.title ? scenario.initialClue.title : `Forensic Clue · Round ${target.round || currentRound}`,
          description: raw,
          round: target.round || currentRound,
        };
      }
    }

    if (currentRound === 1 && scenario?.initialClue?.title) {
      return {
        title: scenario.initialClue.title,
        description: scenario.initialClue.content,
        round: 1,
      };
    }

    if (scenario?.weapon) {
      return {
        title: `The ${scenario.weapon}`,
        description: scenario.intro || `${scenario.victim || 'The victim'} was found lifeless. Evidence points toward the ${scenario.weapon}.`,
        round: currentRound,
      };
    }

    return {
      title: scenario?.title ? `${scenario.title} Evidence` : `Forensic Clue · Round ${currentRound}`,
      description: scenario?.intro || 'Forensic evidence has been recorded at the crime scene. Question all suspects to uncover contradictions.',
      round: currentRound,
    };
  };

  const activeClue = getActiveClue();

  const quickPrompts = [
    'Where were you at 11:35?',
    'Who touched the ice tongs?',
    'Whose shoes are wet?',
  ];

  const isVoteStage = room.status === GAME_STATUS.VOTING || (isFinalRound && autoAdvanceSeconds !== null);

  return (
    <motion.div
      className={`${s.page} ${isHost ? s.pageWithHost : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Background Atmosphere */}
      <div className={s.bgLayer} aria-hidden="true" />

      {/* ── Top HUD matching 01_Investigation ── */}
      <header className={s.hud}>
        <div className={s.hudInner}>
          <div className={s.hudLeft}>
            <span className={s.brandGroup}>
              <span className="ping" style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF2D55' }} />
              <span className={s.brandTitle}>
                Hidden<span style={{ color: '#FF2D55' }}>Truth</span>
              </span>
            </span>

            <span className={s.roomPill}>
              Room <span className={s.roomCode}>{roomCode}</span>
            </span>
          </div>

          {/* Stepper */}
          <ol aria-label="Round phases" className={s.stepperList}>
            {phases.map((p) => (
              <li key={p.label} className={s.stepItem}>
                <span
                  className={s.stepPill}
                  style={{
                    background: p.bg,
                    borderColor: p.border,
                    color: p.color,
                    boxShadow: p.glow,
                  }}
                >
                  <span
                    className={s.stepDot}
                    style={{ background: p.dotBg, color: p.dotColor }}
                  >
                    {p.n}
                  </span>
                  {p.label}
                </span>
                {p.line && (
                  <span
                    className={s.stepLine}
                    style={{ background: p.lineColor }}
                  />
                )}
              </li>
            ))}
          </ol>

          <div className={s.hudRight}>
            {/* Timer Ring */}
            <Timer
              totalSeconds={TIMER_CONFIG.ROUND_DURATION_SECONDS}
              startedAt={roundStartedAt}
              resetTrigger={currentRound}
              onTimeUp={handleRoundTimeUp}
              variant="hud"
            />

            {/* How to play Button */}
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => setShowGuide(true)}
              aria-label="How to play"
              title="How to play"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" />
              </svg>
            </button>

            {/* Exit Button */}
            <button
              type="button"
              className={`${s.iconBtn} ${s.leaveBtn}`}
              onClick={handleLeaveGame}
              aria-label="Leave game"
              title="Exit Investigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
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
            <span className={s.autoAdvanceIcon}>🚨</span>
            <div>
              <div className={s.autoAdvanceTitle}>
                {isFinalRound ? 'ROUND TIME IS UP!' : `ROUND ${currentRound} TIME IS UP!`}
              </div>
              <div className={s.autoAdvanceSub}>
                {isFinalRound
                  ? `Time's up! Moving to the final vote in ${autoAdvanceSeconds}s...`
                  : `Time's up! Revealing Round ${currentRound + 1} clue in ${autoAdvanceSeconds}s...`}
              </div>
            </div>
            <div className={s.countdownPill}>{autoAdvanceSeconds}s</div>
            {isHost && (
              <button
                type="button"
                className={s.btnAdvanceNow}
                onClick={handleAdvanceRound}
                disabled={advancing}
              >
                {advancing ? 'Loading...' : 'Next clue ⚡'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout: Left Role + Right Board & Interrogation ── */}
      <main className={s.mainLayout}>
        {/* Left Column: Role Card & Move */}
        <aside className={s.leftCol}>
          <section
            className={`rise ${s.roleCard}`}
            style={{
              background: hideSecret
                ? 'linear-gradient(160deg, rgba(176,156,255,.4), rgba(176,156,255,.08) 55%, rgba(176,156,255,.2))'
                : myRoleInfo.roleFrame,
            }}
          >
            <div className={s.roleInner}>
              <div
                className={s.roleVisual}
                style={{
                  background: `radial-gradient(240px 280px at 50% 8%, ${
                    hideSecret ? 'rgba(176,156,255,.2)' : myRoleInfo.spot
                  } 0%, transparent 72%), repeating-linear-gradient(90deg, #16102C 0 20px, #191232 20px 21px)`,
                }}
              >
                <span className={`mono ${s.roleLabelTopLeft}`}>Your secret role</span>
                <span
                  className={`mono ${s.roleLabelTopRight}`}
                  style={{ color: hideSecret ? '#A49CC4' : myRoleInfo.color }}
                >
                  Round {currentRound}
                </span>
                <AgentFigure
                  role={hideSecret ? 'unknown' : myRoleInfo.key}
                  size={200}
                  tint={hideSecret ? '#A49CC4' : myRoleInfo.color}
                  glow={!hideSecret}
                  tilt={!hideSecret}
                />
              </div>

              <div className={s.roleContent}>
                <div className={s.roleTitleRow}>
                  <h2
                    className={s.roleName}
                    style={{
                      background: hideSecret
                        ? 'linear-gradient(90deg, #D6CFF2, #7A729C)'
                        : myRoleInfo.roleText,
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {hideSecret ? 'Masked' : myRoleInfo.name}
                  </h2>
                  <span className={s.playerName}>{player?.name || 'You'}</span>
                </div>

                {!hideSecret ? (
                  <>
                    <p className={s.roleGoalLine}>{myRoleInfo.goal}</p>
                    <div className={s.privateIntelBox}>
                      <div className={`mono ${s.privateIntelLabel}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <rect x="4" y="11" width="16" height="10" rx="2" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                        Private intel
                      </div>
                      <p className={s.privateIntelText}>{secretInfo}</p>
                    </div>
                  </>
                ) : (
                  <p className={s.roleMaskedText}>
                    Your role is masked. Anyone looking at your screen sees what the other players see.
                  </p>
                )}

                <div className={s.roleBtnRow}>
                  <button
                    type="button"
                    className={`btn ${s.maskToggleBtn}`}
                    onClick={() => setHideSecret(!hideSecret)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {hideSecret ? 'Show role' : 'Hide role'}
                  </button>

                  <button
                    type="button"
                    className={`btn ${s.scanRoleBtn}`}
                    onClick={() => {
                      setRoleHold(0);
                      setRoleRevealed(false);
                      setShowRoleModal(true);
                    }}
                    title="Scan & Reveal Full Role Dossier"
                  >
                    🕵️ Scan Role
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Your move card */}
          <section className={`glass rise d2 ${s.yourMoveCard}`}>
            <span className={s.bulbIconBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
              </svg>
            </span>
            <div>
              <div className={`mono ${s.yourMoveTag}`}>Your move</div>
              <p className={s.yourMoveText}>{getWhatToDoText()}</p>
            </div>
          </section>

          {/* Host Authority & Controls Panel */}
          {isHost && (
            <section className={`glass rise d3 ${s.hostControlPanel}`}>
              <div className={s.hostControlHeader}>
                <span className={s.hostBadge}>👑 HOST AUTHORITY</span>
                <span className={`mono ${s.hostStageCount}`}>
                  Stage {currentRound} of {maxRounds}
                </span>
              </div>
              <p className={s.hostControlDesc}>
                {isFinalRound
                  ? 'All clues have been revealed. Advance to the final suspect lineup and voting stage when discussion ends.'
                  : `Ready to push the investigation forward? Advance to reveal Clue ${currentRound + 1} for all players.`}
              </p>
              <button
                type="button"
                className={`${s.btnHostAdvance} ${isFinalRound ? s.btnHostVote : ''}`}
                onClick={handleAdvanceRound}
                disabled={advancing}
                id="host-next-stage-panel-btn"
              >
                {advancing ? (
                  <>
                    <span className={s.hostBtnSpinner} />
                    <span>Analyzing Crime Scene...</span>
                  </>
                ) : isFinalRound ? (
                  <>
                    <span>⚖️ Proceed to Final Vote</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>⚡ Advance to Clue {currentRound + 1}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </section>
          )}
        </aside>

        {/* Right Column: Evidence Board & Interrogation Room */}
        <section className={s.rightCol}>
          {/* Jury in session banner when vote time */}
          {isVoteStage && (
            <Link href={`/vote/${roomCode}`} className={`btn shine ${s.juryBanner}`}>
              <span className={`mono ${s.juryTag}`}>Jury in session</span>
              <span className={s.juryTitle}>The lineup is ready. Time to point at the killer.</span>
              <span className={s.juryBtn}>
                Go to the lineup
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          )}

          {/* Evidence Board matching 01_Investigation */}
          <section className={`rise d1 ${s.evidenceBoard}`}>
            <div className={s.boardDots} />
            <div className={s.boardHeader}>
              <div>
                <div className={`mono ${s.caseSub}`}>
                  Case {scenario.caseNumber || '0427'} · Evidence board
                </div>
                <h1 className={s.caseTitle}>{scenario.title || 'The Midnight Mystery'}</h1>
              </div>
              <div className={s.clueProgressWrap}>
                <button
                  type="button"
                  className={s.btnDossierBoard}
                  onClick={() => setShowBriefingModal(true)}
                  title="Open Full Case Briefing Dossier"
                >
                  📁 Case Dossier
                </button>

                <div className={s.clueProgressBars}>
                  {[1, 2, 3].map((r) => {
                    const unlocked = uniqueClues.some((c) => c.round >= r) || currentRound >= r;
                    return (
                      <span
                        key={r}
                        title={`Clue ${r} ${unlocked ? 'found' : 'locked'}`}
                        className={s.clueBar}
                        style={{ background: unlocked ? '#2EE6FF' : 'rgba(176,156,255,.2)' }}
                      />
                    );
                  })}
                </div>
                {isHost && (
                  <button
                    type="button"
                    className={s.hostBoardAdvanceBtn}
                    onClick={handleAdvanceRound}
                    disabled={advancing}
                    title={isFinalRound ? 'Proceed to Final Vote' : `Advance to Clue ${currentRound + 1}`}
                  >
                    {advancing ? 'Advancing...' : isFinalRound ? '⚖️ Proceed to Vote' : `⚡ Next Clue (${currentRound + 1})`}
                  </button>
                )}
              </div>
            </div>

            <div className={s.boardContainer}>
              {/* Red crime strings */}
              <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={s.stringOverlay}>
                <path d="M18 24 Q35 38 50 48" stroke="#FF2D55" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" opacity=".85" />
                <path d="M82 24 Q65 38 50 48" stroke="#FF2D55" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" opacity=".85" />
                <path d="M18 76 Q35 62 50 52" stroke="#FF2D55" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" opacity=".85" />
                <path d="M82 76 Q65 62 50 52" stroke="#FF2D55" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" opacity=".85" />
                {isMultiPlayer && (
                  <>
                    <path d="M28 50 Q38 49 50 50" stroke="#FF2D55" strokeWidth="1.2" fill="none" vectorEffect="non-scaling-stroke" opacity=".6" />
                    <path d="M72 50 Q62 49 50 50" stroke="#FF2D55" strokeWidth="1.2" fill="none" vectorEffect="non-scaling-stroke" opacity=".6" />
                  </>
                )}
              </svg>

              {/* Left Suspects Wing */}
              <div className={`${s.suspectsWing} ${isMultiPlayer ? s.suspectsWingMulti : ''}`}>
                {leftSuspects.map((sItem) => (
                  <button
                    key={sItem.id}
                    type="button"
                    className={`btn ${s.polaroid} ${isMultiPlayer ? s.polaroidCompact : ''}`}
                    onClick={() => {
                      if (!sItem.isMe) {
                        setAccusedId(sItem.id);
                        setShowAccuseModal(true);
                      }
                    }}
                    style={{
                      transform: `rotate(${sItem.tilt}deg)`,
                    }}
                    title={sItem.isMe ? 'You' : `Accuse ${sItem.cleanName}`}
                  >
                    <span className={s.redPin} />
                    <span
                      className={s.polaroidFrame}
                      style={{ background: `radial-gradient(circle at 50% 30%, ${sItem.wash} 0%, #120C26 75%)` }}
                    >
                      <AgentFigure
                        role={sItem.role}
                        tint={sItem.tint}
                        size={isMultiPlayer ? 95 : 120}
                        variant="avatar"
                        glow={false}
                        tilt={true}
                      />
                    </span>
                    <div className={s.polaroidLabel}>
                      <span className={s.polaroidName}>{sItem.cleanName}</span>
                      {sItem.tag && (
                        <span className={s.polaroidTag} style={{ color: sItem.tagColor }}>
                          {sItem.tag}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Center Murder Clue Note */}
              <div className={s.centerClueCard}>
                <span className={s.redPin} style={{ alignSelf: 'center', top: '-7px', position: 'absolute' }} />
                <div className={s.clueBadgeTop}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Forensic Clue · Round {activeClue.round} of {maxRounds}</span>
                </div>
                <div className={s.clueHeadline}>
                  {activeClue.title}
                </div>
                <p className={s.clueBodyText}>
                  {activeClue.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(255,45,85,.25)' }}>
                  <span className="mono-tag" style={{ color: '#FF8AA2', fontSize: '9px' }}>
                    EXHIBIT #0{activeClue.round}
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenAccuse}
                    className="chip"
                    style={{ height: '26px', padding: '0 10px', fontSize: '11px', borderColor: 'rgba(255,45,85,.4)', color: '#FF7B92' }}
                  >
                    Point Finger ⚖️
                  </button>
                </div>
              </div>

              {/* Right Suspects Wing */}
              <div className={`${s.suspectsWing} ${isMultiPlayer ? s.suspectsWingMulti : ''}`}>
                {rightSuspects.map((sItem) => (
                  <button
                    key={sItem.id}
                    type="button"
                    className={`btn ${s.polaroid} ${isMultiPlayer ? s.polaroidCompact : ''}`}
                    onClick={() => {
                      if (!sItem.isMe) {
                        setAccusedId(sItem.id);
                        setShowAccuseModal(true);
                      }
                    }}
                    style={{
                      transform: `rotate(${sItem.tilt}deg)`,
                    }}
                    title={sItem.isMe ? 'You' : `Accuse ${sItem.cleanName}`}
                  >
                    <span className={s.redPin} />
                    <span
                      className={s.polaroidFrame}
                      style={{ background: `radial-gradient(circle at 50% 30%, ${sItem.wash} 0%, #120C26 75%)` }}
                    >
                      <AgentFigure
                        role={sItem.role}
                        tint={sItem.tint}
                        size={isMultiPlayer ? 95 : 120}
                        variant="avatar"
                        glow={false}
                        tilt={true}
                      />
                    </span>
                    <div className={s.polaroidLabel}>
                      <span className={s.polaroidName}>{sItem.cleanName}</span>
                      {sItem.tag && (
                        <span className={s.polaroidTag} style={{ color: sItem.tagColor }}>
                          {sItem.tag}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Interrogation Room (Live Chat) matching 01_Investigation */}
          <section className={`glass rise d2 ${s.interrogationRoom}`}>
            <div className={s.roomHeader}>
              <h2 className={s.roomTitle}>Interrogation room</h2>
              <span className={`mono ${s.roomLiveTag}`}>
                Live · {players.length} in the room
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className={`btn shine ${s.btnAccuseHeader}`}
                onClick={handleOpenAccuse}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="22" y1="12" x2="18" y2="12" />
                  <line x1="6" y1="12" x2="2" y2="12" />
                  <line x1="12" y1="6" x2="12" y2="2" />
                  <line x1="12" y1="22" x2="12" y2="18" />
                </svg>
                Accuse someone
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div ref={chatMessagesRef} className={s.messagesList}>
              {/* Narrator prompt banner */}
              <div className={s.narratorPill}>
                <span className="mono" style={{ fontStyle: 'normal', fontSize: 10, color: '#FF8AA2' }}>
                  Narrator
                </span>
                The doors are locked. The killer is among you.
              </div>

              {messages.map((m) => {
                const isMe = m.player_id === player?.id;
                const ringColor = isMe ? '#2EE6FF' : '#FFC93C';
                return (
                  <div
                    key={m.id}
                    className={`rise ${s.messageRow} ${isMe ? s.messageRowMe : ''}`}
                  >
                    <span
                      className={s.avatarRing}
                      style={{
                        borderColor: ringColor,
                        boxShadow: `0 0 14px -2px ${ringColor}`,
                      }}
                    >
                      <AgentFigure
                        role={isMe ? (hideSecret ? 'unknown' : myRoleInfo.key) : 'unknown'}
                        tint={ringColor}
                        size={44}
                        variant="avatar"
                        glow={false}
                      />
                    </span>
                    <div className={`${s.msgBubble} ${isMe ? s.msgBubbleMe : s.msgBubbleOther}`}>
                      <div className={s.msgSenderName} style={{ color: ringColor }}>
                        {m.sender}
                      </div>
                      <div className={s.msgText}>{m.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Controls */}
            <div className={s.inputArea}>
              <div className={s.promptChipsRow}>
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={s.promptChip}
                    onClick={() => setChatText(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className={s.inputControlsRow}>
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Question someone, or defend yourself…"
                  className={s.chatInput}
                  disabled={sendingChat}
                />
                <button
                  type="submit"
                  disabled={!chatText.trim() || sendingChat}
                  className={`btn ${s.btnSend}`}
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </section>
        </section>
      </main>

      {/* ── 01_Investigation Screen 10: Accuse Modal ── */}
      {showAccuseModal && (
        <div className={s.modalBackdrop}>
          <div className="card rise" style={{ width: '100%', maxWidth: '820px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" className="ib" onClick={() => setShowAccuseModal(false)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <h2 className="disp" style={{ fontSize: '42px', margin: 0 }}>
                  Who do you <span style={{ color: '#E5193A' }}>suspect?</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAccuseModal(false)}
                style={{ color: '#8E8A99', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, color: '#A9A5B4', fontSize: '14px' }}>
              Pick a suspect and a reason. Accusations do not eliminate players — they shape the final vote and provoke the killer.
            </p>

            {/* Suspect Selection Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {players
                .filter((p) => p.id !== player?.id)
                .map((p) => {
                  const isSelected = accusedId === p.id;
                  const cleanName = p.name?.replace(/\s*\((Bot|Test)\)/gi, '') || 'Suspect';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAccusedId(p.id)}
                      style={{
                        position: 'relative',
                        padding: '20px 16px',
                        borderRadius: '18px',
                        background: isSelected ? 'radial-gradient(circle at 50% 20%, rgba(229,25,58,.25), #0B0B10 70%)' : '#0E0E13',
                        border: `1.5px solid ${isSelected ? '#E5193A' : '#22222C'}`,
                        boxShadow: isSelected ? '0 0 30px -4px rgba(229,25,58,.6)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isSelected && (
                        <span aria-hidden="true" className="flick" style={{ position: 'absolute', top: 0, left: '50%', width: '160px', marginLeft: '-80px', height: '100%', background: 'linear-gradient(180deg, rgba(229,25,58,.4), transparent 80%)', clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)', pointerEvents: 'none' }} />
                      )}
                      <AgentFigure role="unknown" tint={isSelected ? '#E5193A' : '#9B6BFF'} size={100} variant="avatar" tilt={false} />
                      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#ECE8E1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanName}
                        </div>
                        <div className="mono-tag" style={{ color: isSelected ? '#E5193A' : '#8E8A99', fontSize: '10px', marginTop: '2px' }}>
                          {isSelected ? 'Accused Target' : p.is_host ? 'Host' : 'Suspect'}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Quick Reason Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="mono-tag" style={{ color: '#8E8A99' }}>Quick suspicion prompt</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  'Wet shoes near the pool',
                  'Nervous laugh during blackout',
                  'Contradicted alibi about the bar',
                  'Was seen near the gallery showcase',
                  'Lied about having the master key',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="chip"
                    onClick={() => setAccuseReason(reason)}
                    style={{
                      borderColor: accuseReason === reason ? '#E5193A' : '#2A2A34',
                      color: accuseReason === reason ? '#ECE8E1' : '#B8B3C2',
                      background: accuseReason === reason ? 'rgba(229,25,58,.15)' : 'transparent',
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="customReason" className="mono-tag" style={{ color: '#8E8A99' }}>
                Accusation statement
              </label>
              <textarea
                id="customReason"
                value={accuseReason}
                onChange={(e) => setAccuseReason(e.target.value)}
                placeholder="State your case... What proves they are lying?"
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #2A2A34',
                  background: '#0E0E13',
                  color: '#ECE8E1',
                  font: '500 15px Inter, sans-serif',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>

            {accuseError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(229,25,58,0.12)', border: '1px solid rgba(229,25,58,0.4)', color: '#FF7B92', fontSize: '13px' }}>
                {accuseError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="b-ghost" onClick={() => setShowAccuseModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="b-red"
                onClick={handleSubmitAccusation}
                disabled={submittingAccusation || !accusedId || !accuseReason.trim()}
              >
                {submittingAccusation ? 'Announcing accusation...' : 'Point the finger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 01_Investigation Screen 05: Case File Briefing Modal ── */}
      {showBriefingModal && (
        <div className={s.modalBackdrop}>
          <div className="card rise" style={{ width: '100%', maxWidth: '1100px', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button type="button" className="ib" onClick={() => setShowBriefingModal(false)} aria-label="Close dossier">
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Left Column: Chalk Outline & 4 Stats Cards */}
              <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '24px', overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1A1A22, #08080B 75%)', border: '1px solid #22222C' }}>
                  <div aria-hidden="true" className="sweep" style={{ position: 'absolute', left: '50%', top: '-60px', width: '280px', marginLeft: '-140px', height: '560px', background: 'linear-gradient(180deg, rgba(236,232,225,.16), transparent 80%)', clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)' }} />
                  <svg viewBox="0 0 300 160" width="100%" height="100%" role="img" aria-label="Chalk outline of the victim by the pool" style={{ position: 'absolute', inset: 0 }}>
                    <rect x="0" y="118" width="300" height="42" fill="#0B2A33" opacity=".6" />
                    <path d="M0 118 H300" stroke="#3FD0E8" strokeWidth=".6" opacity=".4" />
                    <g fill="none" stroke="#ECE8E1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".85" strokeDasharray="5 2.5">
                      <circle cx="92" cy="70" r="14" />
                      <path d="M106 72 C130 64 168 62 196 68 L240 54 M196 68 L244 92 M128 66 L136 36 L150 30 M150 80 L160 104 L186 110" />
                    </g>
                    <g fontFamily="Inter, sans-serif" fontWeight="700" fontSize="8">
                      <path d="M212 108 l7 -13 l7 13 z" fill="#F2B33D" />
                      <text x="219" y="106" textAnchor="middle" fill="#140C00">1</text>
                      <path d="M56 100 l7 -13 l7 13 z" fill="#F2B33D" />
                      <text x="63" y="98" textAnchor="middle" fill="#140C00">2</text>
                      <path d="M152 46 l7 -13 l7 13 z" fill="#F2B33D" />
                      <text x="159" y="44" textAnchor="middle" fill="#140C00">3</text>
                    </g>
                  </svg>
                  <span className="stamp" style={{ position: 'absolute', right: '24px', top: '24px', padding: '6px 14px', border: '3px solid #E5193A', borderRadius: '8px', color: '#E5193A', fontFamily: "'Bebas Neue', sans-serif", fontSize: '34px', letterSpacing: '.1em', background: 'rgba(6,6,8,.6)' }}>
                    Classified
                  </span>
                  <span className="mono-tag" style={{ position: 'absolute', left: '20px', bottom: '16px', color: '#8E8A99' }}>
                    Scene photo · rooftop penthouse · 40th floor
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px' }}>
                    <div className="mono-tag" style={{ color: '#F2B33D', fontSize: '10px' }}>Victim</div>
                    <div style={{ fontSize: '14px', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scenario?.victim?.split(',')[0] || 'Julian Ross'}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px' }}>
                    <div className="mono-tag" style={{ color: '#F2B33D', fontSize: '10px' }}>Time</div>
                    <div style={{ fontSize: '14px', marginTop: '2px', fontWeight: 600 }}>11:35 PM</div>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px' }}>
                    <div className="mono-tag" style={{ color: '#F2B33D', fontSize: '10px' }}>Scene</div>
                    <div style={{ fontSize: '14px', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scenario?.setting ? scenario.setting.slice(0, 18) : 'Crime Scene'}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px' }}>
                    <div className="mono-tag" style={{ color: '#F2B33D', fontSize: '10px' }}>Weapon</div>
                    <div style={{ fontSize: '14px', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scenario?.weapon ? scenario.weapon.slice(0, 18) : 'Unknown…'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Narrator Typewriter Briefing */}
              <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span className="mono-tag" style={{ color: '#8E8A99' }}>
                  Case file #{scenario?.caseNumber || '0427'} · {scenario?.setting ? scenario.setting.slice(0, 32) : 'active investigation'}
                </span>
                <h1 className="disp" style={{ fontSize: 'clamp(54px, 7vw, 92px)', margin: 0 }}>
                  {scenario?.title || 'The Midnight Penthouse'}
                </h1>
                <div style={{ padding: '18px 20px', borderLeft: '2px solid #E5193A', background: 'linear-gradient(90deg, rgba(229,25,58,.1), transparent)', borderRadius: '0 14px 14px 0' }}>
                  <div className="mono-tag" style={{ color: '#E5193A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="beat" style={{ width: 7, height: 7, borderRadius: '50%', background: '#E5193A', display: 'inline-block' }} />
                    Narrator
                  </div>
                  <p className="tw" style={{ margin: '8px 0 0', fontSize: '16px', color: '#D8D3CC', lineHeight: 1.6 }}>
                    {scenario?.intro || 'Lights cut out for a few moments during the thunderstorm. When they flicker back, the victim lies lifeless. One of you is the killer.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#A9A5B4', fontSize: '15px' }}>
                    {players.length} suspects in the room. 1 killer hidden among you.
                  </span>
                </div>
                <button
                  type="button"
                  className="b-red"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    setShowBriefingModal(false);
                    setRoleHold(0);
                    setRoleRevealed(false);
                    setShowRoleModal(true);
                  }}
                >
                  Reveal my secret role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 01_Investigation Screen 06 & 07: Hold-to-Scan Secret Role Modal ── */}
      {showRoleModal && (
        <div className={s.modalBackdrop}>
          <div className="card rise" style={{ width: '100%', maxWidth: '980px', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button type="button" className="ib" onClick={() => setShowRoleModal(false)} aria-label="Close role modal">
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '64px', flexWrap: 'wrap' }}>
              {/* 3D Flipper Card */}
              <div style={{ position: 'relative', width: '360px', height: '540px', perspective: '1600px', flex: 'none' }}>
                <div
                  className="flipper"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `rotateY(${roleRevealed ? 180 : 0}deg)`,
                    transition: 'transform 1s cubic-bezier(.3,1.25,.4,1)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Front Face: Fingerprint Hold Scan */}
                  <div
                    className="face"
                    style={{
                      background: 'repeating-linear-gradient(45deg, #0E0E13 0 12px, #111118 12px 24px)',
                      border: '1px solid #2A2A34',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '26px',
                    }}
                  >
                    <div aria-hidden="true" style={{ position: 'absolute', inset: '16px', border: '1px solid rgba(229,25,58,.3)', borderRadius: '22px', pointerEvents: 'none' }} />
                    <span className="mono-tag" style={{ color: '#E5193A' }}>Top secret · eyes only</span>
                    <button
                      type="button"
                      className={isHolding ? 'shake' : ''}
                      onPointerDown={handleHoldStart}
                      onPointerUp={handleHoldEnd}
                      onPointerLeave={handleHoldEnd}
                      aria-label="Press and hold to reveal your role"
                      style={{
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        background: `conic-gradient(#E5193A 0 ${roleHold}%, #22222C ${roleHold}% 100%)`,
                        display: 'grid',
                        placeItems: 'center',
                        touchAction: 'none',
                        userSelect: 'none',
                        transition: 'box-shadow 0.2s ease',
                        boxShadow: isHolding ? '0 0 35px rgba(229,25,58,.6)' : 'none',
                      }}
                    >
                      <span style={{ width: '166px', height: '166px', borderRadius: '50%', background: 'radial-gradient(circle at 50% 40%, #1A1A22, #0A0A0E)', display: 'grid', placeItems: 'center' }}>
                        <svg width="86" height="86" viewBox="0 0 24 24" fill="none" stroke="#E5193A" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 6px rgba(229,25,58,.8))' }}>
                          <path d="M12 11c0 3-1 6-3 8M8 11a4 4 0 0 1 8 0c0 2 0 4-1 6M5 9a7 7 0 0 1 14 0c0 3 0 5-1 8M12 15c0 2-.5 3.5-1.5 5M3 13c.5-1 .8-2.5 1-4M20 13.5c.2-1 .3-2 .3-3" />
                        </svg>
                      </span>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <div className="disp" style={{ fontSize: '38px' }}>Press &amp; hold</div>
                      <div style={{ fontSize: '14px', color: '#8E8A99', marginTop: '4px' }}>
                        {isHolding ? `Scanning identity ${roleHold}%…` : 'to scan your fingerprint'}
                      </div>
                    </div>
                  </div>

                  {/* Back Face: Revealed Secret Role */}
                  <div
                    className="face"
                    style={{
                      transform: 'rotateY(180deg)',
                      background: `radial-gradient(300px 320px at 50% 22%, ${myRoleInfo.color}33, #0A0F14 70%)`,
                      border: `1.5px solid ${myRoleInfo.color}88`,
                      boxShadow: `0 40px 80px -30px ${myRoleInfo.color}88`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '22px 24px 24px',
                      boxSizing: 'border-box',
                      gap: '12px',
                    }}
                  >
                    <span className="mono-tag" style={{ alignSelf: 'flex-start', color: myRoleInfo.color }}>
                      Role · Confidential
                    </span>
                    <AgentFigure role={myRoleInfo.key} tint={myRoleInfo.color} size={220} glow={true} tilt={false} />
                    <h2 className="disp" style={{ fontSize: '56px', color: myRoleInfo.color, textShadow: `0 0 24px ${myRoleInfo.color}66`, margin: 0 }}>
                      {myRoleInfo.name}
                    </h2>
                    <div style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: 'rgba(6,6,8,.7)', border: `1px dashed ${myRoleInfo.color}88`, boxSizing: 'border-box' }}>
                      <div className="mono-tag" style={{ color: '#F2B33D', fontSize: '10px' }}>Private intel</div>
                      <p className="tw" style={{ margin: '4px 0 0', fontSize: '13px', color: '#E6F6F9', lineHeight: 1.5 }}>
                        {secretInfo}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explainer Column */}
              <div style={{ flex: '0 1 440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span className="chip" style={{ alignSelf: 'flex-start', cursor: 'default', borderColor: 'rgba(242,179,61,.4)', color: '#F2B33D' }}>
                  Hide your screen from other players
                </span>
                <h1 className="disp" style={{ fontSize: 'clamp(54px, 7vw, 92px)', margin: 0 }}>
                  Your secret<br />role
                </h1>
                <p style={{ margin: 0, color: '#A9A5B4', fontSize: '16px' }}>
                  Secret cards were dealt. One belongs to the killer. Nobody else can see yours — keep it that way.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}>
                    <span style={{ color: '#3FD0E8', fontWeight: 700 }}>Detective</span><br />
                    <span style={{ color: '#8E8A99' }}>Gets private clues</span>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}>
                    <span style={{ color: '#E5193A', fontWeight: 700 }}>Killer</span><br />
                    <span style={{ color: '#8E8A99' }}>Blend in, survive</span>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}>
                    <span style={{ color: '#F2B33D', fontWeight: 700 }}>Witness</span><br />
                    <span style={{ color: '#8E8A99' }}>Saw key details</span>
                  </div>
                  <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}>
                    <span style={{ color: '#B76CFF', fontWeight: 700 }}>Suspect</span><br />
                    <span style={{ color: '#8E8A99' }}>Defend your alibi</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {roleRevealed ? (
                    <>
                      <button
                        type="button"
                        className="b-ghost"
                        onClick={() => {
                          setRoleRevealed(false);
                          setRoleHold(0);
                        }}
                      >
                        Hide again
                      </button>
                      <button
                        type="button"
                        className="b-red"
                        onClick={() => setShowRoleModal(false)}
                      >
                        Enter investigation
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="b-ghost"
                      onClick={() => {
                        setRoleHold(100);
                        setRoleRevealed(true);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Quick Reveal (Click to Flip)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 01_Investigation Screen 11: Spotlight Accusation Reaction ── */}
      {reactionData && (
        <div className={s.modalBackdrop} style={{ background: 'radial-gradient(800px 900px at 50% 20%, rgba(229,25,58,.35), #060608 85%)' }}>
          <div className="card rise" style={{ width: '100%', maxWidth: '1000px', padding: '40px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '56px', flexWrap: 'wrap', position: 'relative' }}>
            {/* Dramatic Spotlight Cone & Accused Figure */}
            <div style={{ flex: '1 1 420px', position: 'relative', height: '520px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span aria-hidden="true" className="flick" style={{ position: 'absolute', top: '-40px', left: '50%', width: '420px', marginLeft: '-210px', height: '580px', background: 'linear-gradient(180deg, rgba(229,25,58,.5), rgba(229,25,58,0) 85%)', clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)', pointerEvents: 'none' }} />
              <span className="shake" style={{ display: 'block', marginBottom: '20px' }}>
                <AgentFigure role="unknown" tint={reactionData.accusedTint} size={300} tilt={false} />
              </span>
            </div>

            {/* Drama Reaction Dialogue */}
            <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <span className="mono-tag" style={{ color: '#E5193A' }}>
                Accusation · round {currentRound}
              </span>
              <h1 className="disp glitch" style={{ fontSize: 'clamp(54px, 7vw, 92px)', margin: 0 }}>
                “It was <span style={{ color: '#E5193A' }}>{reactionData.accusedName}</span>.”
              </h1>
              <div className="card" style={{ padding: '20px 22px', borderColor: 'rgba(229,25,58,.35)' }}>
                <div className="mono-tag" style={{ color: '#E5193A' }}>Narrator reacts</div>
                <p className="tw" style={{ margin: '8px 0 0', fontSize: '18px', color: '#E6E1DA', lineHeight: 1.5 }}>
                  {reactionData.narratorText}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#6E6A7A' }}>
                Accusations don&apos;t eliminate anyone — they shape the final vote.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="b-red"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    setReactionData(null);
                    if (isFinalRound) {
                      router.push(`/vote/${roomCode}`);
                    }
                  }}
                >
                  {isFinalRound ? 'To the final vote' : 'Continue investigation'}
                </button>
                {isHost && !isFinalRound && (
                  <button
                    type="button"
                    className="b-ghost"
                    onClick={() => {
                      setReactionData(null);
                      handleAdvanceRound();
                    }}
                  >
                    Advance to Clue {currentRound + 1}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beginner Guide Modal */}
      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </motion.div>
  );
}

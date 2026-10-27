'use client';

import { useState, useEffect, useRef } from 'react';
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
import HowToPlayModal from '@/components/HowToPlayModal';
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
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
        }),
      });

      const data = await res.json();
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
  const isHost = Boolean(
    currentPlayer?.is_host ||
    player?.isHost ||
    (room?.host_id && (room.host_id === player?.id || room.host_id === currentPlayer?.id))
  );

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

  const getRoleGoal = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('kill')) return "You are the Killer. Don't get caught.";
    if (r.includes('detec')) return "You are the Detective. Find the killer.";
    if (r.includes('witn')) return "You are the Witness. Share what you saw when the time is right.";
    return "You are a Suspect. Clear your name and find the real killer.";
  };

  const getWhatToDoText = () => {
    if (room?.status === GAME_STATUS.VOTING || (isFinalRound && autoAdvanceSeconds !== null)) {
      return 'Vote for the killer.';
    }
    if (showAccuseModal) {
      return 'Pick who you think did it.';
    }
    if (currentRound >= 2) {
      return 'New clue is out. Discuss it and find who is lying.';
    }
    return 'Read your role. Then ask others where they were at midnight.';
  };

  let activeStepName = 'Clue';
  let activeStepIndex = 0;
  if (room?.status === GAME_STATUS.VOTING || (isFinalRound && autoAdvanceSeconds !== null)) {
    activeStepName = 'Vote';
    activeStepIndex = 3;
  } else if (showAccuseModal) {
    activeStepName = 'Accuse';
    activeStepIndex = 2;
  } else if (currentRound >= 2) {
    activeStepName = 'Discuss';
    activeStepIndex = 1;
  } else {
    activeStepName = 'Clue';
    activeStepIndex = 0;
  }

  const sortedClues = [...uniqueClues].sort((a, b) => (b.round || 0) - (a.round || 0));

  return (
    <div className={`${s.page} ${isHost ? s.pageWithHost : ''}`}>
      {/* Background Ambience */}
      <div className={s.bgLayer}>
        <div className={s.bgGrid} />
        <div className={s.orbRed} />
        <div className={s.orbViolet} />
      </div>

      {/* Top Nav (Room code & Guide are in global Navbar; here we show round badge & timer) */}
      <header className={s.topNav}>
        <div className={s.navLeft}>
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
                {advancing ? 'Loading...' : 'Next clue ⚡'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guidance Section: Progress Strip & "What to do now" Bar */}
      <section className={s.guidanceSection} aria-label="Game Guidance">
        {/* Step Progress Strip */}
        <div className={s.progressStrip}>
          {['Clue', 'Discuss', 'Accuse', 'Vote'].map((step, idx) => {
            const isCurrent = activeStepName === step;
            const isPast = activeStepIndex > idx;
            return (
              <div
                key={step}
                className={`${s.stepItem} ${isCurrent ? s.stepCurrent : ''} ${isPast ? s.stepPast : ''}`}
              >
                <div className={s.stepPill}>
                  <span className={s.stepNumber}>{isPast ? '✓' : idx + 1}</span>
                  <span className={s.stepLabel}>{step}</span>
                </div>
                {idx < 3 && <span className={s.stepArrow}>›</span>}
              </div>
            );
          })}
        </div>

        {/* "What to do now" Bar */}
        <div className={s.whatToDoBar}>
          <span className={s.whatToDoTag}>WHAT TO DO NOW</span>
          <span className={s.whatToDoText}>{getWhatToDoText()}</span>
        </div>
      </section>

      {/* Main Dashboard (On mobile: Role Card -> Latest Clue -> Chat -> Suspects List. On desktop: 2 Columns) */}
      <main className={s.dashboard}>
        {/* Left Column (Desktop) */}
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

          {/* Secret Role Card (Compact with bold goal line & small 3D thumbnail) */}
          <motion.div
            className={`${s.roleCard} ${roleMeta.cardClass}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Top of role card: bold goal line */}
            <div className={s.roleGoalBanner}>
              <strong className={s.roleGoalText}>{getRoleGoal(currentRole)}</strong>
            </div>

            <div className={s.roleHeader}>
              <div className={s.roleIdentityGroup}>
                <div
                  className={s.thumbWrapper}
                  onClick={() => setShowCharacterModal(true)}
                  title="Tap to inspect 3D character"
                >
                  <RoleModelCanvas role={currentRole} size="thumb" hidden={hideSecret} />
                  <span className={s.thumbZoomIcon}>🔍</span>
                </div>
                <div className={s.roleTitleGroup}>
                  <span className={s.roleSubtitle}>Your Role</span>
                  <span className={`${s.roleTitle} ${roleMeta.titleClass}`}>
                    {hideSecret ? '••••••••' : roleMeta.title}
                  </span>
                  <button
                    type="button"
                    className={s.btnViewCharacter}
                    onClick={() => setShowCharacterModal(true)}
                  >
                    View character
                  </button>
                </div>
              </div>

              <div className={s.hideRoleWrap}>
                <button
                  type="button"
                  className={s.peekToggle}
                  onClick={() => setHideSecret(!hideSecret)}
                >
                  {hideSecret ? '👁️ Show my role' : '🙈 Hide my role'}
                </button>
                <span className={s.hideRoleHint}>So others can&apos;t see your screen</span>
              </div>
            </div>

            {/* Secret briefing / hint */}
            <div
              className={`${s.secretBox} ${hideSecret ? s.hiddenSecret : ''}`}
              onClick={() => hideSecret && setHideSecret(false)}
            >
              {hideSecret ? (
                <span className={s.secretHiddenPrompt}>Tap to reveal your private briefing...</span>
              ) : (
                <div className={s.secretVisibleText}>
                  <div className={s.secretLabel}>Private Intel & Alibi:</div>
                  <div>{secretInfo}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column (Desktop) */}
        <div className={s.rightCol}>
          {/* Active Clues (Latest Clue first) */}
          <motion.div
            className={s.cluesContainer}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={s.sectionTitle}>
              <span>📁 Revealed Evidence</span>
              <span className={s.cluesCountBadge}>
                {uniqueClues.length} Discovered
              </span>
            </div>

            <div className={s.cluesList}>
              <AnimatePresence>
                {sortedClues.length === 0 ? (
                  <div className={s.cluesEmpty}>
                    Searching crime scene for initial clues...
                  </div>
                ) : (
                  sortedClues.map((c, idx) => (
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
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className={s.sectionTitle}>
              <span>💬 Interrogation & Discussion</span>
              <button
                type="button"
                className={s.btnAccuseTrigger}
                onClick={handleOpenAccuse}
              >
                🚨 Accuse someone
              </button>
            </div>

            <div ref={chatMessagesRef} className={s.chatFeed}>
              {messages.length === 0 ? (
                <div className={s.chatEmpty}>
                  No messages yet. Ask someone where they were or defend yourself!
                </div>
              ) : (
                messages.map((m) => {
                  const isNarrator = m.type === 'narrator' || m.sender === 'narrator';
                  const isAccusation = m.type === 'accusation';
                  const isMe = m.player_id === player?.id;

                  return (
                    <div
                      key={m.id}
                      className={`${s.msgRow} ${
                        isAccusation || isNarrator
                          ? s.msgRowNarrator
                          : isMe
                          ? s.msgRowMe
                          : s.msgRowOther
                      }`}
                    >
                      {!isNarrator && !isAccusation && (
                        <span className={s.msgSender}>
                          {isMe ? 'You' : m.sender}
                        </span>
                      )}
                      <div
                        className={`${s.msgBubble} ${
                          isAccusation
                            ? s.bubbleAccusation
                            : isNarrator
                            ? s.bubbleNarrator
                            : isMe
                            ? s.bubbleMe
                            : s.bubbleOther
                        }`}
                      >
                        {isNarrator && <strong>🎙️ AI Narrator: </strong>}
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className={s.chatInputForm}>
              <input
                type="text"
                className={s.chatInput}
                placeholder="Ask someone where they were, or defend yourself..."
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

          {/* Suspects Roster (Moved higher on page, with 'You' badge and 'Bot' tag) */}
          <motion.div
            className={s.rosterContainer}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className={s.sectionTitle}>
              <span>👥 Suspects ({players.length})</span>
            </div>
            <div className={s.rosterGrid}>
              {players.map((p) => {
                const isMe = p.id === player?.id;
                const isBot = Boolean(
                  p.is_bot ||
                  (p.name && (p.name.includes('(Bot)') || p.name.includes('(Test)')))
                );
                const cleanName = p.name ? p.name.replace(/\s*\((Bot|Test)\)/gi, '') : 'Player';

                return (
                  <div
                    key={p.id}
                    className={`${s.rosterChip} ${isMe ? s.rosterChipMe : ''}`}
                  >
                    {p.is_host && <span className={s.hostCrown} title="Host">👑</span>}
                    <span className={s.playerNameText}>{cleanName}</span>
                    {isMe && <span className={s.badgeYou}>You</span>}
                    {isBot && <span className={s.badgeBot}>Bot</span>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Sticky Host Next Clue Button (Sticky at the bottom of the screen, only host sees it) */}
      {isHost && (
        <div className={s.hostStickyBar}>
          <div className={s.hostStickyInner}>
            <div className={s.hostStickyInfo}>
              <span className={s.hostBadgeText}>👑 Host Authority</span>
              <span className={s.hostRoundText}>Round {currentRound} of {maxRounds}</span>
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
                  <span>Start Vote</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Next clue</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
              <h3 className={s.modalTitle}>🚨 Accuse someone</h3>
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
                <div style={{ color: 'var(--neon-red)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
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
                  {submittingAccusation ? 'Accusing...' : 'Accuse someone 🚨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3D Character Inspection Modal */}
      {showCharacterModal && (
        <div
          className={s.modalOverlay}
          onClick={() => setShowCharacterModal(false)}
        >
          <div
            className={s.characterModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle} style={{ color: 'var(--text-primary)' }}>
                  {roleMeta.title}
                </h3>
                <span className={s.modalSubtitle}>
                  Drag around to inspect 3D character
                </span>
              </div>
              <button
                type="button"
                className={s.modalClose}
                onClick={() => setShowCharacterModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={s.characterCanvasWrap}>
              <RoleModelCanvas role={currentRole} size="large" />
            </div>
            <button
              type="button"
              className={s.btnCancel}
              onClick={() => setShowCharacterModal(false)}
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Close Character View
            </button>
          </div>
        </div>
      )}

      {/* Beginner Guide Modal */}
      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}


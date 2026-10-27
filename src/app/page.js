'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { supabase } from '@/lib/supabase';
import WatcherCanvas from '@/components/WatcherCanvas';
import s from './page.module.css';

/* Stagger animation helpers */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function HomePage() {
  const sceneRef = useRef(null);
  const { player, clearPlayer } = usePlayer();
  const [isRoomActive, setIsRoomActive] = useState(false);

  // Guarantee Home page always loads from the very top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  // Verify that player's room is actually still active (not finished)
  useEffect(() => {
    if (!player?.roomCode) {
      setIsRoomActive(false);
      return;
    }

    let isMounted = true;
    async function verifyActiveRoom() {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('status')
          .eq('code', player.roomCode.toUpperCase())
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data || data.status === 'finished') {
          clearPlayer();
          setIsRoomActive(false);
        } else {
          setIsRoomActive(true);
        }
      } catch (err) {
        console.error('Room verification error:', err);
      }
    }

    verifyActiveRoom();
    return () => {
      isMounted = false;
    };
  }, [player?.roomCode, clearPlayer]);

  // Mouse spotlight torch coordinates
  const handlePointerMove = (e) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sceneRef.current.style.setProperty('--mouse-x', `${x}px`);
    sceneRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={sceneRef}
      className={s.scene}
      onPointerMove={handlePointerMove}
    >
      {/* ── Interactive Spotlight Torch ── */}
      <div className={s.spotlight} />

      {/* ── Atmospheric Background & 3D Watcher Character ── */}
      <div className={s.bgLayer}>
        <WatcherCanvas />
        <div className={s.bgGrid} />
        <motion.div
          className={s.orbRed}
          animate={{ scale: [1, 1.15, 1], opacity: [0.65, 0.95, 0.65] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={s.orbViolet}
          animate={{ scale: [1, 1.2, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
        <motion.div
          className={s.orbCyan}
          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <div className={s.scanline} />
      </div>

      {/* ── Main Content Grid ── */}
      <motion.div
        className={s.content}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* LEFT — Hero & Overview */}
        <motion.div className={s.hero} variants={stagger} initial="hidden" animate="show">
          {/* Status Badge */}
          <motion.div className={s.liveBadge} variants={fadeUp}>
            <span className={s.liveDot} />
            <span className={s.liveText}>Live AI Murder Mystery</span>
          </motion.div>

          {/* Title */}
          <motion.div className={s.titleBlock} variants={fadeUp}>
            <span className={s.titleSub}>Real-Time Party Investigation</span>
            <h1 className={s.title}>
              <span className={s.titleWhite}>Hidden</span>
              <span className={s.titleRed}>Truth</span>
            </h1>
          </motion.div>

          {/* Short, Clear Description */}
          <motion.p className={s.desc} variants={fadeUp}>
            One of your friends committed the crime. Question alibis, uncover AI-generated clues,
            and unmask the killer before time runs out.
          </motion.p>

          {/* 3 Simple Steps */}
          <motion.div className={s.howItWorksGrid} variants={fadeUp}>
            <div className={s.howStep}>
              <span className={s.stepIcon}>📱</span>
              <div>
                <strong className={s.stepTitle}>1. Join with Code</strong>
                <p className={s.stepSub}>Any phone or laptop, no app download.</p>
              </div>
            </div>
            <div className={s.howStep}>
              <span className={s.stepIcon}>🎭</span>
              <div>
                <strong className={s.stepTitle}>2. Secret Roles</strong>
                <p className={s.stepSub}>Killer, Detective, Witness, or Suspect.</p>
              </div>
            </div>
            <div className={s.howStep}>
              <span className={s.stepIcon}>⚖️</span>
              <div>
                <strong className={s.stepTitle}>3. Vote & Unmask</strong>
                <p className={s.stepSub}>Interrogate in real-time, then cast your ballot.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT — Action Panel */}
        <motion.div className={s.panel} variants={stagger} initial="hidden" animate="show">
          {/* Active Game in Progress Card */}
          {player?.roomCode && isRoomActive && (
            <motion.div className={s.resumeCard} variants={fadeScale}>
              <div className={s.resumeHeader}>
                <span className={s.resumeDot} />
                <span className={s.resumeTag}>ACTIVE INVESTIGATION</span>
                <button
                  type="button"
                  onClick={() => {
                    clearPlayer();
                    setIsRoomActive(false);
                  }}
                  className={s.btnDismissResume}
                  title="Dismiss session"
                >
                  ✕
                </button>
              </div>
              <div className={s.resumeTitle}>Room {player.roomCode}</div>
              <p className={s.resumeText}>
                You have an ongoing case as <strong>{player.name}</strong>.
              </p>
              <div className={s.resumeActions}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                  <Link href={`/game/${player.roomCode}`} className={s.btnResume} id="btn-resume-game">
                    <span className={s.btnIcon}>⚡</span>
                    Resume Game
                  </Link>
                </motion.div>
                <button
                  type="button"
                  onClick={() => {
                    clearPlayer();
                    setIsRoomActive(false);
                  }}
                  className={s.btnLeaveSession}
                >
                  Leave
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Card */}
          <motion.div className={s.card} variants={fadeScale}>
            <span className={s.cardLabel}>Play Right Now</span>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/create" className={s.btnPrimary} id="btn-create-game">
                <span className={s.btnIcon}>⚡</span>
                Host a Game
              </Link>
            </motion.div>

            <div className={s.divider}>
              <span className={s.dividerLine} />
              <span className={s.dividerText}>or</span>
              <span className={s.dividerLine} />
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/join" className={s.btnSecondary} id="btn-join-game">
                <span className={s.btnIcon}>🔑</span>
                Enter Room Code
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div className={s.stats} variants={fadeUp}>
            <div className={s.stat}>
              <div className={s.statValue}>3–10</div>
              <div className={s.statLabel}>Players</div>
            </div>
            <div className={s.stat}>
              <div className={s.statValue}>15m</div>
              <div className={s.statLabel}>Per Game</div>
            </div>
            <div className={s.stat}>
              <div className={s.statValue}>0</div>
              <div className={s.statLabel}>Downloads</div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Bottom Bar ── */}
      <div className={s.bottomBar}>
        <span className={s.bottomItem}>Instant Browser Play</span>
        <span className={s.bottomDot} />
        <span className={s.bottomItem}>Join with 4-letter code</span>
        <span className={s.bottomDot} />
        <span className={s.bottomItem}>Powered by Google Gemini</span>
      </div>
    </div>
  );
}

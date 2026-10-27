'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { supabase } from '@/lib/supabase';
import WatcherCanvas from '@/components/WatcherCanvas';
import HowToPlayModal from '@/components/HowToPlayModal';
import s from './page.module.css';


/* Stagger children helper */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

/* Ticker content - repeated for continuous scroll */
const TICKER = '⚠ CRIME SCENE — DO NOT CROSS  ◈  SUSPECT IDENTIFIED  ◈  AI NARRATOR ONLINE  ◈  TRUST NO ONE  ◈  ';

/* Rotating typewriter taglines */
const TAGLINES = [
  'One room. One killer. Zero alibis.',
  'The room knows who did it.',
  'Every round reveals a lie.',
  'Vote before the timer expires.',
];

/* Simulated live case snippets */
const LIVE_SNIPPETS = [
  { icon: '🎙️', sender: 'Narrator', text: 'The penthouse lights cut out at 11:41 PM. Julian Ross was shoved into the pool.' },
  { icon: '🔍', sender: 'Detective', text: 'I found wet sneaker prints leading straight to the bar. Who was grabbing a drink?' },
  { icon: '👁️', sender: 'Witness', text: 'I saw someone slipping through the patio curtains wearing a dark hoodie.' },
  { icon: '🩸', sender: 'The Killer', text: 'I was in the kitchen getting ice the whole time. Ask Alex!' },
  { icon: '⚖️', sender: 'The Room', text: 'Votes are locked in. The killer has nowhere left to hide.' },
];

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

        // If the game has concluded or room is not found, clear old session
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

  // Typewriter state
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Live feed simulation snippet state
  const [snippetIndex, setSnippetIndex] = useState(0);

  // Secret card flip state
  const [secretFlipped, setSecretFlipped] = useState(false);
  const [showGuide, setShowGuide] = useState(false);


  // Mouse spotlight coordinates
  const handlePointerMove = (e) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sceneRef.current.style.setProperty('--mouse-x', `${x}px`);
    sceneRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Typewriter effect logic
  useEffect(() => {
    const fullText = TAGLINES[taglineIndex];
    const speed = isDeleting ? 30 : 60;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < fullText.length) {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2200);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(fullText.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, taglineIndex]);

  // Live snippet auto-cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setSnippetIndex((prev) => (prev + 1) % LIVE_SNIPPETS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeSnippet = LIVE_SNIPPETS[snippetIndex];

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

      {/* ── Crime Tape Ticker ── */}
      <div className={s.tape}>
        <div className={s.tapeTrack}>
          <span className={s.tapeItem}>{TICKER}</span>
          <span className={s.tapeItem}>{TICKER}</span>
          <span className={s.tapeItem}>{TICKER}</span>
          <span className={s.tapeItem}>{TICKER}</span>
        </div>
      </div>

      {/* ── Main Content: two columns on desktop ── */}
      <motion.div
        className={s.content}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* LEFT — Hero Text */}
        <motion.div className={s.hero} variants={stagger} initial="hidden" animate="show">
          {/* Live AI badge with Animated Equalizer Bars */}
          <motion.div className={s.liveBadge} variants={fadeUp}>
            <div className={s.equalizer}>
              {[0.4, 0.8, 0.5, 1, 0.6].map((rate, i) => (
                <motion.span
                  key={i}
                  className={s.eqBar}
                  animate={{ height: ['4px', `${12 * rate + 3}px`, '4px'] }}
                  transition={{
                    duration: 0.6 + i * 0.15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <span className={s.liveText}>AI Narrator Online</span>
          </motion.div>

          {/* Title */}
          <motion.div className={s.titleBlock} variants={fadeUp}>
            <span className={s.titleSub}>Nothing is what it seems.</span>
            <h1 className={s.title}>
              <motion.span
                className={s.titleWhite}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                Hidden
              </motion.span>
              <motion.span
                className={s.titleRed}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Truth
              </motion.span>
            </h1>
          </motion.div>

          {/* Interactive Typewriter Row */}
          <motion.div className={s.typewriterRow} variants={fadeUp}>
            <span>&gt; {currentText}</span>
            <span className={s.cursorBlink} />
          </motion.div>

          {/* Description */}
          <motion.p className={s.desc} variants={fadeUp}>
            A live murder mystery game for you and your friends. One person in your group committed the crime.
            Uncover clues, question everyone's alibi, and vote out the killer before time runs out!
          </motion.p>

          {/* Feature tags with subtle floating pulse */}
          <motion.div className={s.tags} variants={fadeUp}>
            {[
              { icon: '🎭', text: 'Secret Roles' },
              { icon: '🤖', text: 'AI Narrated' },
              { icon: '📱', text: 'Phone Controls' },
              { icon: '⚡', text: 'Real-time' },
            ].map((t, idx) => (
              <motion.span
                key={t.text}
                className={s.tag}
                whileHover={{ scale: 1.05, y: -2 }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: idx * 0.4 }}
              >
                <span className={s.tagIcon}>{t.icon}</span> {t.text}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>


        {/* RIGHT — Action Panel & Live Teaser */}
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
                You have an active investigation in progress as <strong>{player.name}</strong>.
              </p>
              <div className={s.resumeActions}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ flex: 1 }}>
                  <Link href={`/game/${player.roomCode}`} className={s.btnResume} id="btn-resume-game">
                    <span className={s.btnIcon}>⚡</span>
                    Resume Investigation
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

          {/* Glass card with buttons */}
          <motion.div className={s.card} variants={fadeScale}>
            <span className={s.cardLabel}>Start Playing</span>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
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

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link href="/join" className={s.btnSecondary} id="btn-join-game">
                <span className={s.btnIcon}>🔑</span>
                Enter Room Code
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className={s.btnGuideLanding}
              >
                <span>📖</span>
                <span>How to Play Guide</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Stats row */}
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
              <div className={s.statValue}>∞</div>
              <div className={s.statLabel}>Stories</div>
            </div>
          </motion.div>

          {/* Live Investigation Simulation Feed */}
          <motion.div className={s.liveFeedCard} variants={fadeUp}>
            <div className={s.liveFeedHeader}>
              <span className={s.liveFeedLabel}>
                <span style={{ color: 'var(--neon-red)' }}>●</span> Live Investigation Feed
              </span>
              <span className={s.feedPill}>SIMULATED CASE</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={snippetIndex}
                className={s.feedMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <span style={{ fontSize: '1.1rem' }}>{activeSnippet.icon}</span>
                <div>
                  <strong>{activeSnippet.sender}: </strong>
                  <span>{activeSnippet.text}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Bottom Bar ── */}
      <div className={s.bottomBar}>
        <span className={s.bottomItem}>No app download</span>
        <span className={s.bottomDot} />
        <span className={s.bottomItem}>Join with 4-letter code</span>
        <span className={s.bottomDot} />
        <span className={s.bottomItem}>Free to play</span>
      </div>

      {/* ── How to Play Beginner Guide Modal ── */}
      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

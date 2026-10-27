'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import s from './page.module.css';

export default function JoinRoomPage() {
  const router = useRouter();
  const { setPlayer } = usePlayer();

  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode && urlCode.length === 4) {
        setCode(urlCode.toUpperCase());
      }
    }
  }, []);


  const handleCodeChange = (e) => {
    // Only allow letters, uppercase, max 4 characters
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    setCode(val);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = playerName.trim();

    if (!cleanCode || cleanCode.length !== 4) {
      setError('Please enter a valid 4-letter room code.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your name or alias.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    if (cleanName.length > 20) {
      setError('Name must not exceed 20 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, playerName: cleanName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join room.');
      }

      // Save player session in context & localStorage
      setPlayer({
        id: data.player.id,
        name: data.player.name,
        roomId: data.room.id,
        roomCode: data.room.code,
        isHost: false,
      });

      // Redirect player to room lobby
      router.push(`/lobby/${data.room.code}`, { scroll: true });
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Something went wrong. Please check your code.');
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      {/* Background Ambience */}
      <div className={s.bgLayer}>
        <div className={s.bgGrid} />
        <div className={s.orbCyan} />
        <div className={s.orbRed} />
      </div>

      {/* Top Nav */}
      <header className={s.topNav}>
        <Link href="/" className={s.backLink}>
          ← Back
        </Link>
        <span className={s.badge}>Enter Room</span>
      </header>

      {/* Main Container */}
      <motion.main
        className={s.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className={s.header}>
          <h1 className={s.title}>
            JOIN A <span className={s.titleCyan}>GAME</span>
          </h1>
          <p className={s.subtitle}>
            Enter the 4-letter room code and your name to jump in.
          </p>
        </div>

        {/* Form Card */}
        <div className={s.card}>
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className={s.fieldGroup}>
              <label htmlFor="roomCode" className={s.label}>
                <span>4-Letter Room Code</span>
                <span className={s.charCount}>{code.length}/4</span>
              </label>
              <input
                id="roomCode"
                type="text"
                className={s.codeInput}
                placeholder="XXXX"
                value={code}
                onChange={handleCodeChange}
                maxLength={4}
                autoComplete="off"
                disabled={loading}
                autoFocus={!code}
              />
            </div>

            <div className={s.fieldGroup}>
              <label htmlFor="playerName" className={s.label}>
                <span>Your Name</span>
                <span className={s.charCount}>{playerName.length}/20</span>
              </label>
              <input
                id="playerName"
                type="text"
                className={s.input}
                placeholder="e.g. Sam"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (error) setError('');
                }}
                maxLength={20}
                autoComplete="off"
                disabled={loading}
                autoFocus={Boolean(code && code.length === 4)}
              />
            </div>

            {error && (
              <motion.div
                className={s.errorMessage}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className={s.btnSubmit}
              disabled={loading || code.length !== 4 || !playerName.trim()}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <div className={s.spinner} />
                  <span>Connecting to Room...</span>
                </>
              ) : (
                <>
                  <span>🔑</span>
                  <span>Join Game</span>
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // AI Party Game
      </footer>
    </div>
  );
}

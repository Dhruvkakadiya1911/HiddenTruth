'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import s from './page.module.css';

export default function CreateRoomPage() {
  const router = useRouter();
  const { setPlayer } = usePlayer();

  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guarantee Create page always loads from the very top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = hostName.trim();

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
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: cleanName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create room.');
      }

      // Save player session in context & localStorage
      setPlayer({
        id: data.player.id,
        name: data.player.name,
        roomId: data.room.id,
        roomCode: data.room.code,
        isHost: true,
      });

      // Redirect host to room lobby
      router.push(`/lobby/${data.room.code}`, { scroll: true });
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

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
        <Link href="/" className={s.backLink}>
          ← Back
        </Link>
        <span className={s.badge}>Host Setup</span>
      </header>

      {/* Main Container */}
      <motion.main
        className={s.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className={s.header}>
          <div className={s.tagline}>Create Investigation</div>
          <h1 className={s.title}>
            HOST A <span className={s.titleRed}>MYSTERY</span>
          </h1>
          <p className={s.subtitle}>
            Create a room, get a 4-letter code, and invite your friends!
          </p>
        </div>

        {/* Form Card */}
        <div className={s.card}>
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className={s.fieldGroup}>
              <label htmlFor="hostName" className={s.label}>
                <span>Your Name or Nickname</span>
                <span className={s.charCount}>{hostName.length}/20</span>
              </label>
              <div className={s.inputWrapper}>
                <input
                  id="hostName"
                  type="text"
                  className={s.input}
                  placeholder="e.g. Alex or Sherlock"
                  value={hostName}
                  onChange={(e) => {
                    setHostName(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={20}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
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
              disabled={loading || !hostName.trim()}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <div className={s.spinner} />
                  <span>Generating Crime Scene...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Create Room</span>
                </>
              )}
            </motion.button>
          </form>

          <p className={s.infoNote}>
            Once created, a 4-letter room code will be generated for your friends to join on their phones.
          </p>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className={s.footer}>
        HiddenTruth // AI Party Game
      </footer>
    </div>
  );
}

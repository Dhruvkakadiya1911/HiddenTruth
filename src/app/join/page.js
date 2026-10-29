'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import HowToPlayModal from '@/components/HowToPlayModal';
import s from './page.module.css';

export default function JoinRoomPage() {
  const router = useRouter();
  const { setPlayer } = usePlayer();
  const inputRef = useRef(null);

  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-focus and URL query string code reading
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode && urlCode.length === 4) {
        setCode(urlCode.toUpperCase());
      }
    }
    // Subtle timeout so layout finishes mounting before keyboard focus
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    setCode(val);
    if (error) setError('');
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    const match = text.match(/[?&]code=([a-zA-Z]{4})/i) || text.match(/[a-zA-Z]{4}/);
    if (match) {
      const extracted = (match[1] || match[0]).toUpperCase();
      setCode(extracted);
      if (error) setError('');
    } else {
      const cleaned = text.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
      if (cleaned) {
        setCode(cleaned);
        if (error) setError('');
      }
    }
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

      setPlayer({
        id: data.player.id,
        name: data.player.name,
        roomId: data.room.id,
        roomCode: data.room.code,
        isHost: false,
      });

      router.push(`/lobby/${data.room.code}`, { scroll: true });
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Something went wrong. Please check your code.');
      setLoading(false);
    }
  };

  const codeChars = [0, 1, 2, 3].map((i) => code[i] || '');
  const isComplete = code.length === 4 && playerName.trim().length >= 2;

  return (
    <div className={s.page}>
      {/* Atmosphere Glow */}
      <div className={s.bgGlow} aria-hidden="true" />

      {/* Top Header */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.brandGroup}>
            <span className={s.brandDot} />
            <span className={s.brandTitle}>HiddenTruth</span>
            <span className={s.brandSub}>NOTHING IS WHAT IT SEEMS.</span>
          </Link>

          <div className={s.headerActions}>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className={s.btnGuide}
            >
              📖 Guide
            </button>
            <div className={s.systemReadyPill}>
              <span className={s.readyDot} />
              SYSTEM READY
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={s.main}>
        <div className={s.wrap}>
          {/* Left Column / Heading */}
          <div className={s.heroCol}>
            <Link href="/" className={s.backBtn} aria-label="Go back to home">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>

            <span className={s.tagline}>
              You&apos;ve been summoned
            </span>

            <h1 className={s.heroTitle}>
              Enter<br />the room
            </h1>

            <p className={s.heroDesc}>
              Ask the host for the 4-letter code on their screen. Pick an alias — it&apos;s the only thing the others will know about you.
            </p>
          </div>

          {/* Right Column / Join Card */}
          <div className={s.joinCard}>
            <form onSubmit={handleSubmit} className={s.form}>
              {/* 4-Box Code Input */}
              <div className={s.fieldGroup}>
                <label htmlFor="roomCodeInput" className={s.fieldLabel}>
                  Room code
                </label>
                <div
                  className={s.codeContainer}
                  onClick={() => inputRef.current?.focus()}
                >
                  <div className={s.codeGrid}>
                    {codeChars.map((ch, idx) => {
                      const isActive = isFocused && (code.length === idx || (code.length === 4 && idx === 3));
                      const isFilled = Boolean(ch);
                      return (
                        <div
                          key={idx}
                          className={`${s.codeBox} ${isFilled ? s.codeBoxFilled : ''} ${isActive ? s.codeBoxActive : ''}`}
                        >
                          {ch}
                        </div>
                      );
                    })}
                  </div>
                  <input
                    ref={inputRef}
                    id="roomCodeInput"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    onPaste={handlePaste}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    maxLength={4}
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    disabled={loading}
                    aria-label="4-letter room code"
                    className={s.hiddenInput}
                  />
                </div>
              </div>

              {/* Alias Input */}
              <div className={s.fieldGroup}>
                <label htmlFor="aliasInput" className={s.fieldLabel}>
                  Your alias
                </label>
                <input
                  id="aliasInput"
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="What should we call you?"
                  maxLength={20}
                  autoComplete="off"
                  disabled={loading}
                  className={s.aliasInput}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className={s.errorBox}>
                  {error}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading || !isComplete}
                className={`${s.submitBtn} ${isComplete && !loading ? s.submitBtnActive : s.submitBtnDisabled}`}
              >
                {loading ? 'Joining the case...' : 'Join the case'}
              </button>

              {/* Footer text */}
              <p className={s.cardFooter}>
                No app · No account · Just a browser
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Guide Modal */}
      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

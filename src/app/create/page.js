'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import s from './page.module.css';

export default function CreateRoomPage() {
  const router = useRouter();
  const { setPlayer } = usePlayer();

  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

      setPlayer({
        id: data.player.id,
        name: data.player.name,
        roomId: data.room.id,
        roomCode: data.room.code,
        isHost: true,
      });

      router.push(`/lobby/${data.room.code}`, { scroll: true });
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const isComplete = hostName.trim().length >= 2;

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        {/* Left Column / Heading */}
        <div className={s.heroCol}>
          <Link href="/" className="ib" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="mono-tag rise" style={{ color: '#E5193A' }}>
            Host a new case
          </span>
          <h1 className="disp rise r1" style={{ fontSize: 'clamp(64px, 9vw, 130px)' }}>
            Create<br />the room
          </h1>
          <p className="rise r2" style={{ margin: 0, color: '#A9A5B4', fontSize: '18px', maxWidth: '440px' }}>
            Start a new murder mystery session. You will receive a 4-letter room code to invite your friends.
          </p>
        </div>

        {/* Right Column / Card */}
        <div className={`card rise r2 ${s.createCard}`}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label htmlFor="hostalias" className="mono-tag" style={{ color: '#8E8A99' }}>
                Your host alias
              </label>
              <input
                id="hostalias"
                type="text"
                value={hostName}
                onChange={(e) => {
                  setHostName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Detective Miller"
                maxLength={20}
                autoComplete="off"
                disabled={loading}
                style={{
                  height: '58px',
                  padding: '0 18px',
                  borderRadius: '14px',
                  border: '1px solid #2A2A34',
                  background: '#0E0E13',
                  color: '#ECE8E1',
                  font: '500 17px Inter, sans-serif',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(229,25,58,0.12)',
                  border: '1px solid rgba(229,25,58,0.4)',
                  color: '#FF7B92',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="b-red"
              style={{ width: '100%' }}
              disabled={loading || !isComplete}
            >
              {loading ? 'Generating crime scene...' : 'Launch case lobby'}
            </button>

            <p className="mono-tag" style={{ margin: 0, textAlign: 'center', color: '#5C5966' }}>
              Host controls round pacing and progression
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

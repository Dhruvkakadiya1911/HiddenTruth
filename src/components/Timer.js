'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import s from './Timer.module.css';

export default function Timer({
  initialSeconds = 180,
  totalSeconds = 180,
  startedAt,
  label = 'TIMER',
  onTimeUp,
  resetTrigger,
  showExpiredBanner = true,
  expiredText = '00:00',
  variant,
}) {
  const computeRemaining = useCallback(() => {
    if (startedAt) {
      const startMs = typeof startedAt === 'string' ? new Date(startedAt).getTime() : Number(startedAt);
      if (!isNaN(startMs) && startMs > 0) {
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        return Math.max(0, totalSeconds - elapsed);
      }
    }
    return initialSeconds;
  }, [startedAt, totalSeconds, initialSeconds]);

  const [timeLeft, setTimeLeft] = useState(computeRemaining);
  const [isExpired, setIsExpired] = useState(() => computeRemaining() <= 0);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    const remaining = computeRemaining();
    setTimeLeft(remaining);
    setIsExpired(remaining <= 0);
  }, [resetTrigger, startedAt, totalSeconds, computeRemaining]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!isExpired) {
        setIsExpired(true);
        if (onTimeUpRef.current) {
          onTimeUpRef.current();
        }
      }
      return;
    }

    const interval = setInterval(() => {
      if (startedAt) {
        const currentRemaining = computeRemaining();
        setTimeLeft(currentRemaining);
        if (currentRemaining <= 0) {
          clearInterval(interval);
          if (!isExpired) {
            setIsExpired(true);
            if (onTimeUpRef.current) {
              onTimeUpRef.current();
            }
          }
        }
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isExpired, startedAt, computeRemaining]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Redesign Variant: Investigation HUD (conic-gradient ring in red/danger)
  if (variant === 'hud') {
    const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, Math.round((timeLeft / totalSeconds) * 100))) : 0;
    const ringGradient = `conic-gradient(#FF2D55 0% ${pct}%, rgba(255,45,85,.15) ${pct}% 100%)`;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: '46px',
          padding: '0 16px 0 6px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, rgba(255,45,85,.22), rgba(255,122,61,.12))',
          border: '1px solid rgba(255,45,85,.45)',
          boxShadow: '0 0 24px -6px rgba(255,45,85,.6)',
        }}
      >
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: ringGradient,
            display: 'grid',
            placeItems: 'center',
            transition: 'background .9s linear',
          }}
        >
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#1B0C1E',
            }}
          />
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '20px',
            fontWeight: 600,
            color: '#FF6B8A',
            letterSpacing: '.02em',
          }}
        >
          {isExpired ? expiredText : formattedTime}
        </span>
      </div>
    );
  }

  // Redesign Variant: Lineup Jury timer (conic-gradient ring in cyan with clock icon)
  if (variant === 'lineup') {
    const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, Math.round((timeLeft / totalSeconds) * 100))) : 0;
    const ringGradient = `conic-gradient(#2EE6FF 0% ${pct}%, rgba(46,230,255,.12) ${pct}% 100%)`;
    return (
      <div
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 18px 12px 12px',
          borderRadius: '22px',
        }}
      >
        <span
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: ringGradient,
            display: 'grid',
            placeItems: 'center',
            transition: 'background 1s linear',
            boxShadow: '0 0 24px -6px rgba(46,230,255,.8)',
          }}
        >
          <span
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#150F2C',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2EE6FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </span>
        <div>
          <div className="mono" style={{ fontSize: '10px', color: '#A49CC4' }}>
            Jury closes in
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '26px',
              fontWeight: 600,
              color: '#2EE6FF',
              lineHeight: 1.1,
            }}
          >
            {isExpired ? expiredText : formattedTime}
          </div>
        </div>
      </div>
    );
  }

  // Default fallback badge
  let timerTheme = s.timerNormal;
  let digitsTheme = s.digitsNormal;
  let icon = '⏳';

  if (isExpired) {
    if (expiredText !== '00:00') {
      timerTheme = s.timerNormal;
      digitsTheme = s.digitsNormal;
      icon = '💬';
    } else {
      timerTheme = s.timerCritical;
      digitsTheme = s.digitsCritical;
      icon = '🚨';
    }
  } else if (timeLeft <= 15) {
    timerTheme = s.timerCritical;
    digitsTheme = s.digitsCritical;
    icon = '🚨';
  } else if (timeLeft <= 45) {
    timerTheme = s.timerWarning;
    digitsTheme = s.digitsWarning;
    icon = '⚠️';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
      <div className={`${s.timerPill} ${timerTheme}`}>
        <span className={s.timerIcon}>{icon}</span>
        {label && <span className={s.timerLabel}>{label}</span>}
        <span className={`${s.timerDigits} ${digitsTheme}`}>
          {isExpired ? expiredText : formattedTime}
        </span>
      </div>

      {isExpired && showExpiredBanner && (
        <div className={s.expiredAlert}>
          <span>⏰ TIME HAS EXPIRED! Conclude arguments.</span>
        </div>
      )}
    </div>
  );
}

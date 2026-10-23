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

  // Reset or re-sync when resetTrigger, startedAt, or totalSeconds changes
  useEffect(() => {
    const remaining = computeRemaining();
    setTimeLeft(remaining);
    setIsExpired(remaining <= 0);
  }, [resetTrigger, startedAt, totalSeconds, computeRemaining]);

  // Countdown interval
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

  // Formatting minutes:seconds
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color state
  let timerTheme = s.timerNormal;
  let digitsTheme = s.digitsNormal;
  let icon = '⏳';

  if (isExpired || timeLeft <= 15) {
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
          {isExpired ? '00:00' : formattedTime}
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

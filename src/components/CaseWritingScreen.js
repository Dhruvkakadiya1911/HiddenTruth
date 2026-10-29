'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import s from './CaseWritingScreen.module.css';

const STEPS = [
  { key: 'victim', label: 'Choosing a victim...' },
  { key: 'scene', label: 'Setting the scene...' },
  { key: 'weapon', label: 'Hiding the weapon...' },
  { key: 'roles', label: 'Dealing secret roles...' },
];

export default function CaseWritingScreen({
  roomCode = '',
  isComplete = false,
  onComplete,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Stage 1: Setting the scene
    const t1 = setTimeout(() => {
      setActiveStep(1);
      setProgress(40);
    }, 2200);

    // Stage 2: Hiding the weapon
    const t2 = setTimeout(() => {
      setActiveStep(2);
      setProgress(65);
    }, 4800);

    // Stage 3: Dealing secret roles
    const t3 = setTimeout(() => {
      setActiveStep(3);
      setProgress(88);
    }, 7400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // When API completes or room becomes active
  useEffect(() => {
    if (isComplete) {
      setActiveStep(4);
      setProgress(100);

      // Brief moment for player to see all 4 steps checked
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 700);

      // Once faded out, call onComplete to switch to the investigation screen
      const doneTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1200);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(doneTimer);
      };
    }
  }, [isComplete, onComplete]);

  return (
    <div className={`${s.screen} ${isFadingOut ? s.screenFadeOut : ''}`}>
      <div className={s.bgAtmosphere} aria-hidden="true" />

      {/* Top Navbar */}
      <header className={s.header}>
        <div className={s.brandGroup}>
          <span className={s.brandDot} />
          <span className={s.brandTitle}>HIDDENTRUTH</span>
        </div>

        <div className={s.headerNav}>
          {roomCode && (
            <span className={s.resumePill}>
              <span className={s.resumeDot} />
              Resume {roomCode}
            </span>
          )}
          <Link href="/join" className={s.navBtn}>
            Join
          </Link>
          <Link href="/create" className={s.navBtnActive}>
            Host
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className={s.mainContainer}>
        {/* Left: Animated Radar Scanner */}
        <div className={s.radarWrapper}>
          <svg className={s.radarSvg} viewBox="0 0 300 300" aria-hidden="true">
            {/* Outer Ring */}
            <circle
              cx="150"
              cy="150"
              r="140"
              fill="none"
              stroke="rgba(255, 45, 85, 0.35)"
              strokeWidth="1.5"
            />
            {/* Middle Dashed Ring */}
            <circle
              cx="150"
              cy="150"
              r="95"
              fill="none"
              stroke="rgba(255, 45, 85, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            {/* Inner Ring */}
            <circle
              cx="150"
              cy="150"
              r="50"
              fill="none"
              stroke="rgba(255, 45, 85, 0.2)"
              strokeWidth="1"
            />
            {/* Crosshairs */}
            <line
              x1="10"
              y1="150"
              x2="290"
              y2="150"
              stroke="rgba(255, 45, 85, 0.3)"
              strokeWidth="1"
            />
            <line
              x1="150"
              y1="10"
              x2="150"
              y2="290"
              stroke="rgba(255, 45, 85, 0.3)"
              strokeWidth="1"
            />
            {/* Diagonals */}
            <line
              x1="51"
              y1="51"
              x2="249"
              y2="249"
              stroke="rgba(255, 45, 85, 0.12)"
              strokeWidth="0.8"
            />
            <line
              x1="249"
              y1="51"
              x2="51"
              y2="249"
              stroke="rgba(255, 45, 85, 0.12)"
              strokeWidth="0.8"
            />
          </svg>

          {/* Sweeping Cone Beam */}
          <div className={s.radarSweep} aria-hidden="true" />

          {/* Glowing Red Core Dot */}
          <div className={s.radarCenterCore} aria-hidden="true" />
        </div>

        {/* Right: Narrative Case Writing Progress */}
        <section className={s.contentWrapper}>
          <div className={s.narratorTag}>
            {isComplete ? 'The Investigation Begins' : 'The Narrator is Writing'}
          </div>
          <h1 className={s.mainHeadline}>
            {isComplete ? (
              <>
                <span style={{ color: '#2EE6FF' }}>Case File</span>
                <br />
                Ready to Enter
              </>
            ) : (
              <>
                Your Case Is
                <br />
                Being Written
              </>
            )}
          </h1>

          {/* Checklist */}
          <div className={s.stepList}>
            {STEPS.map((st, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;

              return (
                <div
                  key={st.key}
                  className={`${s.stepItem} ${
                    isDone ? s.stepItemDone : isActive ? s.stepItemActive : ''
                  }`}
                >
                  {isDone ? (
                    <span className={s.iconDone}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  ) : isActive ? (
                    <span className={s.iconActive}>
                      <span className={s.pulseDot} />
                    </span>
                  ) : (
                    <span className={s.iconPending} />
                  )}
                  <span>{st.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className={s.progressTrack}>
            <div
              className={s.progressFill}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            <div
              className={s.progressThumb}
              style={{ left: `${Math.min(100, progress)}%` }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

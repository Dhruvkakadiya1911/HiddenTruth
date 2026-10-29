'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import AgentFigure from '@/components/AgentFigure';
import s from './RevealScene.module.css';

const ROLE_META = {
  killer: {
    name: 'The Killer',
    color: '#FF2D55',
    tint: '#B76CFF',
    border: 'rgba(255, 45, 85, 0.55)',
    spot: 'rgba(255, 45, 85, 0.38)',
    bg: 'linear-gradient(180deg, #2A0A1E, #150818)',
  },
  detective: {
    name: 'The Detective',
    color: '#2EE6FF',
    tint: '#2EE6FF',
    border: 'rgba(46, 230, 255, 0.5)',
    spot: 'rgba(46, 230, 255, 0.32)',
    bg: 'linear-gradient(180deg, #0A2232, #0C1020)',
  },
  witness: {
    name: 'The Witness',
    color: '#FFC93C',
    tint: '#FFC93C',
    border: 'rgba(255, 201, 60, 0.5)',
    spot: 'rgba(255, 201, 60, 0.3)',
    bg: 'linear-gradient(180deg, #2A1E08, #140E10)',
  },
  suspect: {
    name: 'The Suspect',
    color: '#B76CFF',
    tint: '#FF6BB5',
    border: 'rgba(183, 108, 255, 0.55)',
    spot: 'rgba(183, 108, 255, 0.34)',
    bg: 'linear-gradient(180deg, #22103E, #120A22)',
  },
};

export default function RevealScene({
  scenario = {},
  killer = {},
  killerName = '',
  groupWon = false,
  mostVoted = null,
  totalVotes = 0,
  voteBreakdown = [],
  players = [],
  narratorMonologue = '',
  verdictSummary = '',
  roomCode = '',
}) {
  const router = useRouter();
  const { clearPlayer, player } = usePlayer();

  // Cards start unmasked by default (empty maskedState)
  const [maskedState, setMaskedState] = useState({});

  const finalKillerName = killer?.name || killerName || scenario?.killerName || 'The Killer';

  const handlePlayAgain = () => {
    clearPlayer();
    router.push('/', { scroll: true });
  };

  const getNormRole = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('kill')) return 'killer';
    if (r.includes('detec')) return 'detective';
    if (r.includes('witn')) return 'witness';
    return 'suspect';
  };

  // Build cast data
  const castList = players.map((p) => {
    const roleKey = getNormRole(p.role);
    const meta = ROLE_META[roleKey] || ROLE_META.suspect;
    const isMe = p.id === player?.id;
    const isMasked = !!maskedState[p.id];

    return {
      id: p.id,
      name: p.name || 'Player',
      role: roleKey,
      roleName: isMe ? `${meta.name} · you` : meta.name,
      color: meta.color,
      tint: meta.tint,
      bg: meta.bg,
      border: meta.border,
      spot: meta.spot,
      text: p.secret_info || 'Present at the scene of the crime.',
      isMasked,
    };
  });

  const anyMasked = Object.values(maskedState).some(Boolean);

  const toggleAllMasks = () => {
    if (anyMasked) {
      setMaskedState({});
    } else {
      const allTrue = {};
      players.forEach((p) => {
        allTrue[p.id] = true;
      });
      setMaskedState(allTrue);
    }
  };

  const toggleSingleMask = (id) => {
    setMaskedState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Build timeline events from scenario or defaults
  const timelineEvents = scenario.timeline && scenario.timeline.length > 0
    ? scenario.timeline
    : [
        {
          time: '11:15 PM',
          text: `An intense argument breaks out near the terrace over missing financial records.`,
          dot: '#B76CFF',
        },
        {
          time: '11:30 PM',
          text: `${scenario.victim || 'Julian'} threatens to expose the betrayal to the entire board.`,
          dot: '#FFC93C',
        },
        {
          time: '11:33 PM',
          text: 'The terrace lights flicker and briefly cut out. Rain blows through the curtains.',
          dot: '#2EE6FF',
        },
        {
          time: '11:35 PM',
          text: `${finalKillerName} strikes down ${scenario.victim || 'Julian'}, dumps the evidence, and slips away leaving wet footprints.`,
          dot: '#FF2D55',
        },
      ];

  const caveatQuote = groupWon
    ? `“Caught red-handed. The jury connected every clue, and ${finalKillerName} was handcuffed on the spot.”`
    : `“The jury couldn't agree. ${finalKillerName} just smiled, adjusted their collar, and walked out free.”`;

  return (
    <div className={s.container}>
      {/* ── Section 1: The Killer Reveal Stage matching 03_The_Reveal ── */}
      <section className={`rise ${s.stageCard}`}>
        <div aria-hidden="true" className={s.stageStripes} />

        {/* Left Side: Spotlight + Agent Figure + UNMASKED Stamp */}
        <div className={s.stageVisual}>
          <span aria-hidden="true" className={`spot ${s.stageSpotlight}`} />
          <AgentFigure role="killer" size={310} glow={true} tilt={true} />
          <span className={`stamp ${s.unmaskedStamp}`}>UNMASKED</span>
        </div>

        {/* Right Side: Verdict Info */}
        <div className={s.stageContent}>
          <span className={`mono rise d1 ${s.outcomeTag}`}>
            {groupWon ? 'The jury caught the killer' : 'The killer wins'}
          </span>

          <h1 className={`rise d2 ${s.outcomeTitle}`}>
            It was<br />
            <span className={s.killerHighlight}>{finalKillerName}.</span>
          </h1>

          <p className={`rise d3 ${s.caveatQuote}`}>
            {narratorMonologue || caveatQuote}
          </p>

          <div className={`rise d4 ${s.chipsRow}`}>
            <span className={s.chip}>
              <span className={`mono ${s.chipTag}`}>Victim</span>
              {scenario.victim || 'Julian Ross'}
            </span>
            <span className={s.chip}>
              <span className={`mono ${s.chipTag}`}>Weapon</span>
              {scenario.weapon || 'Ice tongs'}
            </span>
            <span className={s.chip}>
              <span className={`mono ${s.chipTag}`}>Motive</span>
              {scenario.motive || 'Blackmail & betrayal'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section 2: Cast Unmasked (3D Flip Cards) ── */}
      <section className={s.castSection}>
        <div className={s.castHeader}>
          <div>
            <span className={`mono ${s.castSub}`}>Masks off · tap a card to flip it</span>
            <h2 className={s.castTitle}>Who was really who</h2>
          </div>
          <button
            type="button"
            className={`btn glass ${s.btnToggleAll}`}
            onClick={toggleAllMasks}
          >
            {anyMasked ? 'Unmask everyone' : 'Replay the unmasking'}
          </button>
        </div>

        <div className={s.castGrid}>
          {castList.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              className={`rise ${s.castCard}`}
              onClick={() => toggleSingleMask(r.id)}
              style={{ animationDelay: `${idx * 0.1}s` }}
              title={r.isMasked ? `Tap to unmask ${r.name}` : `${r.name} was ${r.roleName}`}
            >
              <div
                className={`flip ${s.flipInner}`}
                style={{
                  transform: r.isMasked ? 'rotateY(0deg)' : 'rotateY(180deg)',
                }}
              >
                {/* Front Face: Masked */}
                <div className={`face glass ${s.faceFront}`}>
                  <span className={`mono ${s.classifiedTag}`}>CLASSIFIED</span>
                  <AgentFigure
                    role="unknown"
                    size={180}
                    tint="#A49CC4"
                    glow={false}
                    tilt={false}
                  />
                  <span className={s.cardNameFront}>{r.name}</span>
                  <span className={`mono ${s.unmaskHint}`} style={{ color: r.tint }}>
                    Tap to unmask
                  </span>
                </div>

                {/* Back Face: Revealed Role */}
                <div
                  className={`face ${s.faceBack}`}
                  style={{
                    background: r.bg,
                    border: `1.5px solid ${r.border}`,
                    boxShadow: `0 30px 60px -30px ${r.color}`,
                  }}
                >
                  <div
                    className={s.backVisual}
                    style={{
                      background: `radial-gradient(220px 220px at 50% 15%, ${r.spot} 0%, transparent 72%)`,
                    }}
                  >
                    <span className={`mono ${s.backRoleLabel}`} style={{ color: r.color }}>
                      {r.roleName}
                    </span>
                    <AgentFigure
                      role={r.role}
                      size={172}
                      tint={r.color}
                      glow={true}
                      tilt={true}
                    />
                  </div>

                  <div className={s.backContent} style={{ borderColor: r.border }}>
                    <span className={s.cardNameBack}>{r.name}</span>
                    <span className={s.cardTextBack}>{r.text}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 3: Timeline + Jury Verdict ── */}
      <section className={s.timelineAndVerdictRow}>
        {/* Timeline */}
        <div className={`glass rise ${s.timelineBox}`}>
          <h2 className={s.timelineHeading}>What really happened</h2>
          <ol className={s.timelineList}>
            {timelineEvents.map((e, idx) => (
              <li key={idx} className={s.timelineItem}>
                <div className={s.timelineDotCol}>
                  <span
                    className={s.timelineDot}
                    style={{
                      background: e.dot || '#2EE6FF',
                      boxShadow: `0 0 14px ${e.dot || '#2EE6FF'}`,
                    }}
                  />
                  {idx < timelineEvents.length - 1 && (
                    <span className={s.timelineLine} />
                  )}
                </div>
                <div className={s.timelineContent}>
                  <span
                    className={`mono ${s.timelineTime}`}
                    style={{ color: e.dot || '#2EE6FF' }}
                  >
                    {e.time}
                  </span>
                  <span className={s.timelineText}>{e.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Verdict Box */}
        <div className={`glass rise d1 ${s.verdictBox}`}>
          <div className={s.verdictIconBox}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D9A6FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
            </svg>
          </div>
          <h2 className={s.verdictTitle}>
            {groupWon ? 'The killer was convicted!' : 'No majority on the killer'}
          </h2>
          <p className={s.verdictDesc}>
            {verdictSummary ||
              (groupWon
                ? `The jury successfully identified ${finalKillerName}. Justice was delivered at midnight.`
                : `Not enough votes landed on ${finalKillerName} before the jury closed — the killer walks.`)}
          </p>
        </div>
      </section>

      {/* ── Section 4: Action Buttons ── */}
      <section className={s.actionsRow}>
        <button
          type="button"
          className={`btn shine ${s.btnPlayAnother}`}
          onClick={handlePlayAgain}
        >
          Play another mystery
        </button>
        <Link href="/" className={`btn glass ${s.btnReturnHome}`}>
          Return home
        </Link>
      </section>
    </div>
  );
}

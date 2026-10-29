'use client';

import { useState } from 'react';
import AgentFigure from '@/components/AgentFigure';
import s from './VotePanel.module.css';

export default function VotePanel({
  players = [],
  currentPlayer,
  hasVoted = false,
  myVotedSuspectId,
  onVote,
  voting = false,
  error = '',
  votes = [],
  isHost = false,
  onReveal,
  revealing = false,
  roomCode = '',
}) {
  const [pickedId, setPickedId] = useState(myVotedSuspectId || '');

  const activeSelectedId = myVotedSuspectId || pickedId;
  const pickedSuspect = players.find((p) => p.id === activeSelectedId);

  const handleSelect = (id) => {
    if (hasVoted || voting) return;
    if (id === currentPlayer?.id) return;
    setPickedId(id);
  };

  const handleLockIn = () => {
    if (!pickedId || hasVoted || voting) return;
    if (pickedId === currentPlayer?.id) return;
    onVote(pickedId);
  };

  const totalPlayers = players.length;
  const votedCount = votes.length;

  return (
    <div className={s.container}>
      {/* ── Suspect Lineup Wall matching 02_Lineup_Vote ── */}
      <section aria-label="Suspect lineup" className={`rise d1 ${s.lineupWall}`}>
        {/* Height measurement stripes */}
        <div aria-hidden="true" className={s.heightStripes} />

        {/* Sweeping light bar */}
        <div aria-hidden="true" className="sweep" />

        {/* Height ticks left & right */}
        <div aria-hidden="true" className={s.ticksLeft}>
          <span>7&apos;</span>
          <span>6&apos;</span>
          <span>5&apos;</span>
          <span>4&apos;</span>
          <span>3&apos;</span>
          <span>2&apos;</span>
        </div>
        <div aria-hidden="true" className={s.ticksRight}>
          <span>7&apos;</span>
          <span>6&apos;</span>
          <span>5&apos;</span>
          <span>4&apos;</span>
          <span>3&apos;</span>
          <span>2&apos;</span>
        </div>

        {/* Floor gradient */}
        <div aria-hidden="true" className={s.floorBar} />

        {/* Suspect Slots Grid */}
        <div className={s.suspectsGrid}>
          {players.map((suspect, idx) => {
            const isSelf = suspect.id === currentPlayer?.id;
            const isSelected = activeSelectedId === suspect.id;
            const no = String(idx + 1).padStart(2, '0');

            const isBot = Boolean(suspect.is_bot || suspect.name?.includes('(Bot)'));
            const cleanName = suspect.name ? suspect.name.replace(/\s*\((Bot|Test)\)/gi, '') : 'Player';

            let sub = 'Suspect';
            if (isSelf) {
              sub = 'You · Cannot accuse';
            } else if (suspect.is_host) {
              sub = 'Host';
            } else if (isBot) {
              sub = 'Bot';
            }

            return (
              <button
                key={suspect.id}
                type="button"
                className={`btn ${s.slotBtn} ${isSelf ? s.slotDisabled : ''}`}
                onClick={() => handleSelect(suspect.id)}
                disabled={isSelf || hasVoted}
                aria-pressed={isSelected}
                aria-label={isSelf ? 'You cannot accuse yourself' : `Accuse ${cleanName}`}
              >
                {/* Spotlight cone when selected */}
                {isSelected && <span aria-hidden="true" className={`spot ${s.spotlightCone}`} />}

                {/* Agent figure */}
                <span className={s.figureWrapper}>
                  <AgentFigure
                    role={isSelf ? (currentPlayer?.role || 'unknown') : 'unknown'}
                    tint={isSelected ? '#FF2D55' : isSelf ? '#2EE6FF' : '#A49CC4'}
                    size={210}
                    glow={isSelected}
                    tilt={isSelected}
                  />

                  {/* ACCUSED Stamp when locked on this suspect */}
                  {hasVoted && isSelected && (
                    <span className={`stamp ${s.accusedStamp}`}>
                      ACCUSED
                    </span>
                  )}
                </span>

                {/* Nameplate matching reference */}
                <span className={`${s.nameplate} ${isSelected ? s.nameplateSelected : ''}`}>
                  <span className={`${s.suspectNo} ${isSelected ? s.suspectNoSelected : ''}`}>
                    No. {no}
                  </span>
                  <span className={s.suspectName}>
                    {cleanName} {suspect.is_host && '👑'}
                  </span>
                  <span className={`${s.suspectSub} ${isSelf ? s.suspectSubMe : ''}`}>
                    {sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Decision Bar matching 02_Lineup_Vote ── */}
      <section className={`glass rise d2 ${s.decisionBar}`}>
        {/* Jury avatars */}
        <div className={s.juryGroup}>
          <div className={s.juryAvatars}>
            {players.map((p) => {
              const hasPloyVoted = votes.some((v) => v.voter_id === p.id);
              const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
              return (
                <span
                  key={p.id}
                  title={`${p.name}: ${hasPloyVoted ? 'Voted' : 'Thinking...'}`}
                  className={`${s.juryAvatar} ${hasPloyVoted ? s.juryAvatarVoted : ''}`}
                >
                  {initial}
                </span>
              );
            })}
          </div>
          <span className={s.votedCountLabel}>
            {votedCount} / {totalPlayers} voted
          </span>
        </div>

        {/* Summary text */}
        <div className={s.summaryText}>
          {hasVoted ? (
            <span>
              Locked on <strong style={{ color: '#FF2D55' }}>{pickedSuspect?.name || 'suspect'}</strong>. Waiting for the jury…
            </span>
          ) : pickedSuspect ? (
            <span>
              You&apos;re pointing at <strong style={{ color: '#FF2D55' }}>{pickedSuspect.name}</strong>.
            </span>
          ) : (
            <span>Tap a suspect in the lineup.</span>
          )}
        </div>

        {error && <div className={s.errorText}>{error}</div>}

        {/* CTA: Accuse Button / Locked Button */}
        {!hasVoted ? (
          <button
            type="button"
            className={`btn ${pickedId ? 'shine' : ''} ${s.ctaAccuseBtn} ${!pickedId ? s.ctaDisabledBtn : ''}`}
            onClick={handleLockIn}
            disabled={!pickedId || voting}
          >
            {voting ? (
              'Locking Vote...'
            ) : pickedSuspect ? (
              `Lock in on ${pickedSuspect.name}`
            ) : (
              'Choose a suspect'
            )}
          </button>
        ) : (
          <button type="button" className={`${s.ctaAccuseBtn} ${s.ctaLockedBtn}`} disabled>
            ✓ Vote locked on {pickedSuspect?.name || 'suspect'}
          </button>
        )}

        {/* Host / Reveal Button */}
        {isHost && onReveal && (
          <button
            type="button"
            className={`btn shine ${s.ctaRevealBtn}`}
            onClick={onReveal}
            disabled={revealing}
          >
            {revealing ? 'Unmasking...' : 'Reveal the truth 🎬'}
          </button>
        )}
      </section>
    </div>
  );
}

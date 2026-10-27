'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayer } from '@/hooks/usePlayer';
import { ROLES } from '@/lib/constants';
import RoleModelCanvas from '@/components/RoleModelCanvas';
import s from './RevealScene.module.css';

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
}) {
  const router = useRouter();
  const { clearPlayer } = usePlayer();

  const handlePlayAgain = () => {
    clearPlayer();
    router.push('/', { scroll: true });
  };

  const finalKillerName = killer?.name || killerName || scenario?.killerName || 'The Killer';

  const getRoleIconAndClass = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('kill')) {
      return { icon: '🩸', label: 'The Killer', colorClass: s.roleColorKiller, cardClass: s.rosterRoleKiller };
    }
    if (r.includes('detec')) {
      return { icon: '🔍', label: 'Detective', colorClass: s.roleColorDetective, cardClass: s.rosterRoleDetective };
    }
    if (r.includes('witn')) {
      return { icon: '👁️', label: 'Witness', colorClass: s.roleColorWitness, cardClass: s.rosterRoleWitness };
    }
    return { icon: '🎭', label: 'Suspect', colorClass: s.roleColorSuspect, cardClass: '' };
  };

  return (
    <div className={s.container}>
      {/* 1. Outcome Banner */}
      <motion.div
        className={`${s.outcomeBanner} ${groupWon ? s.outcomeWon : s.outcomeLost}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <span className={s.outcomeBadge}>
          {groupWon ? '🏆 THE INNOCENTS WIN!' : '💀 THE KILLER WINS!'}
        </span>
        <h1 className={s.outcomeHeading}>
          {groupWon ? 'The Killer Was Caught!' : 'The Killer Escaped!'}
        </h1>
        <p className={s.outcomeSub}>
          {verdictSummary || (
            groupWon
              ? `You found the truth: ${finalKillerName} was the killer all along!`
              : `The room voted for ${mostVoted?.suspectName || 'an innocent friend'}, letting ${finalKillerName} walk away with the crime!`
          )}
        </p>
      </motion.div>

      {/* 2. Unmasking The Killer */}
      <motion.div
        className={s.killerCard}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className={s.killerHeader}>
          <RoleModelCanvas role="killer" size="large" />
          <span className={s.killerLabel}>The True Killer</span>
          <h2 className={s.killerName}>{finalKillerName}</h2>
        </div>

        <div className={s.caseDetails}>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>The Victim</span>
            <span className={s.detailVal}>{scenario.victim || 'Unknown'}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>The Weapon</span>
            <span className={s.detailVal}>{scenario.weapon || 'Unknown'}</span>
          </div>
          <div className={s.detailItem}>
            <span className={s.detailLabel}>The Motive</span>
            <span className={s.detailVal}>{scenario.motive || 'Secret grudge'}</span>
          </div>
        </div>

        {scenario.solution && (
          <div className={s.solutionBox}>
            <span className={s.solutionLabel}>How It Happened</span>
            <p className={s.solutionText}>{scenario.solution}</p>
          </div>
        )}
      </motion.div>

      {/* 3. Narrator Closing Monologue */}
      {narratorMonologue && (
        <motion.div
          className={s.monologueBox}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <div className={s.monologueHeader}>
            <span>🎙️ Game Master // Final Story</span>
          </div>
          <p className={s.monologueText}>"{narratorMonologue}"</p>
        </motion.div>
      )}

      {/* 4. Jury Vote Breakdown */}
      <motion.div
        className={s.sectionCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        <div className={s.sectionTitle}>
          <span>⚖️ Jury Vote Breakdown</span>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--f-mono)', color: 'var(--text-muted)' }}>
            {totalVotes} total votes cast
          </span>
        </div>

        <div className={s.tallyList}>
          {voteBreakdown.map((tally) => {
            const isKiller = tally.suspectName === finalKillerName;
            const percentage = totalVotes > 0 ? Math.round((tally.count / totalVotes) * 100) : 0;
            return (
              <div key={tally.suspectId} className={s.tallyItem}>
                <div className={s.tallyItemTop}>
                  <div className={s.tallyName}>
                    {tally.suspectName}
                    {isKiller && <span className={s.tallyBadgeKiller}>REAL KILLER 🩸</span>}
                  </div>
                  <div className={s.tallyCount}>
                    {tally.count} {tally.count === 1 ? 'Vote' : 'Votes'} ({percentage}%)
                  </div>
                </div>

                <div className={s.tallyBarTrack}>
                  <div
                    className={`${s.tallyBarFill} ${isKiller ? s.tallyBarKiller : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {tally.voters && tally.voters.length > 0 && (
                  <div className={s.tallyVoters}>
                    Accused by: {tally.voters.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 5. Complete Character Dossiers Unlocked */}
      <motion.div
        className={s.sectionCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55 }}
      >
        <div className={s.sectionTitle}>
          <span>🎭 Player Roles & Secret Identities</span>
        </div>

        <div className={s.rosterGrid}>
          {players.map((p) => {
            const meta = getRoleIconAndClass(p.role);
            const roleLower = (p.role || '').toLowerCase();
            const cleanSecret = (p.secret_info || '')
              .replace(/^YOU ARE THE (DETECTIVE|KILLER|WITNESS|PRIME SUSPECT|SUSPECT)[.:\s-]*/i, '')
              .replace(/^ROLE:\s*[A-Za-z\s]+[.:\s-]*/i, '')
              .trim();

            const roleSummary = roleLower.includes('kill')
              ? 'Committed the murder and misled the room.'
              : roleLower.includes('detec')
              ? 'Analyzed the crime scene and led the interrogation.'
              : roleLower.includes('witn')
              ? 'Held crucial eyewitness testimony of the crime.'
              : 'Defended their innocence and helped find the truth.';

            return (
              <div key={p.id} className={`${s.rosterCard} ${meta.cardClass}`}>
                <div className={s.rosterCardModel}>
                  <RoleModelCanvas role={p.role || 'suspect'} size="small" />
                </div>
                <div className={s.rosterCardInfo}>
                  <div className={s.rosterCardName}>
                    {p.name} {p.is_host && '👑'}
                  </div>
                  <div className={`${s.rosterCardRole} ${meta.colorClass}`}>
                    {meta.icon} {meta.label}
                  </div>
                  <p className={s.rosterCardSummary}>{roleSummary}</p>
                  {cleanSecret && (
                    <div className={s.rosterCardSecret}>
                      "{cleanSecret}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 6. Return Home / Play Again */}
      <motion.div
        className={s.actionArea}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.65 }}
      >
        <button
          type="button"
          onClick={handlePlayAgain}
          className={s.btnHome}
        >
          Play Another Mystery 🕵️
        </button>
      </motion.div>
    </div>
  );
}

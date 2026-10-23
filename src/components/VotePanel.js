'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import s from './VotePanel.module.css';

export default function VotePanel({
  players = [],
  currentPlayer,
  hasVoted = false,
  myVotedSuspectId,
  onVote,
  voting = false,
  error = '',
}) {
  const [selectedId, setSelectedId] = useState(myVotedSuspectId || '');

  // Filter suspects (allow voting for any player except yourself ideally, or allow all)
  const suspects = players;

  const handleSelect = (id) => {
    if (hasVoted || voting) return;
    if (id === currentPlayer?.id) return;
    setSelectedId(id);
  };

  const handleSubmit = () => {
    if (!selectedId || hasVoted || voting) return;
    if (selectedId === currentPlayer?.id) return;
    onVote(selectedId);
  };

  const votedTarget = players.find((p) => p.id === (myVotedSuspectId || selectedId));

  return (
    <div className={s.container}>
      <div className={s.suspectsGrid}>
        {suspects.map((suspect, idx) => {
          const isSelf = suspect.id === currentPlayer?.id;
          const isSelected = selectedId === suspect.id;
          const isMyVote = hasVoted && myVotedSuspectId === suspect.id;

          let cardStyle = s.suspectCard;
          if (isSelf) cardStyle += ` ${s.cardSelf}`;
          else if (isMyVote) cardStyle += ` ${s.myVoteCard}`;
          else if (isSelected) cardStyle += ` ${s.selectedCard}`;
          if (hasVoted || isSelf) cardStyle += ` ${s.cardDisabled}`;

          return (
            <motion.div
              key={suspect.id}
              className={cardStyle}
              onClick={() => handleSelect(suspect.id)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              whileHover={!hasVoted && !isSelf ? { scale: 1.02 } : {}}
              whileTap={!hasVoted && !isSelf ? { scale: 0.98 } : {}}
            >
              <div className={s.avatar}>
                {suspect.name ? suspect.name.charAt(0).toUpperCase() : '?'}
              </div>

              <div className={s.info}>
                <div className={s.name}>
                  {suspect.name} {suspect.is_host && '👑'}
                </div>
                <div className={s.subtext}>
                  {isSelf && <span className={s.badgeYou}>(You — Cannot accuse yourself)</span>}
                  {isMyVote && <span className={s.badgeVoteTarget}>Accused: Your Vote ⚖️</span>}
                  {!isSelf && !isMyVote && (isSelected ? 'Selected to accuse' : 'Click to accuse')}
                </div>
              </div>

              <div
                className={`${s.checkMark} ${
                  isSelf
                    ? s.checkMarkDisabled
                    : isMyVote
                    ? s.checkMarkMyVote
                    : isSelected
                    ? s.checkMarkSelected
                    : ''
                }`}
              >
                {isSelf ? '✕' : isMyVote ? '✓' : isSelected ? '✓' : ''}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={s.voteActionArea}>
        {error && (
          <div style={{ color: 'var(--neon-red)', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {hasVoted ? (
          <motion.div
            className={s.lockedBanner}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={s.lockedTitle}>
              🔒 VOTE LOCKED IN
            </div>
            <div className={s.lockedDesc}>
              You accused <strong>{votedTarget?.name || 'a player'}</strong>. Waiting for other players to cast their votes...
            </div>
          </motion.div>
        ) : (
          <button
            type="button"
            className={s.btnLockVote}
            onClick={handleSubmit}
            disabled={!selectedId || voting || selectedId === currentPlayer?.id}
          >
            {voting ? (
              'Submitting Accusation...'
            ) : selectedId && selectedId !== currentPlayer?.id ? (
              `Accuse ${suspects.find((p) => p.id === selectedId)?.name || ''} ⚖️`
            ) : (
              'Choose someone above to accuse'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

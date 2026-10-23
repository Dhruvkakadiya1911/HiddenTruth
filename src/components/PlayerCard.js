'use client';

import { motion } from 'framer-motion';
import s from './PlayerCard.module.css';

export default function PlayerCard({ player, isCurrentPlayer, index = 0 }) {
  const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

  return (
    <motion.div
      className={`${s.card} ${isCurrentPlayer ? s.isCurrent : ''}`}
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 15 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <div className={s.left}>
        <div className={`${s.avatar} ${player.is_host ? s.avatarHost : ''}`}>
          {player.is_host ? '👑' : initial}
        </div>
        <div className={s.info}>
          <div className={s.nameRow}>
            <span className={s.name}>{player.name}</span>
            {isCurrentPlayer && <span className={s.youTag}>You</span>}
          </div>
          <span className={s.status}>Ready in lobby</span>
        </div>
      </div>

      <div className={s.right}>
        {player.is_host ? (
          <span className={s.hostBadge}>Host</span>
        ) : (
          <span className={s.readyDot} title="Ready" />
        )}
      </div>
    </motion.div>
  );
}

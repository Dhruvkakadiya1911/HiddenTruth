'use client';

import { motion } from 'framer-motion';
import s from './ClueCard.module.css';

export default function ClueCard({ clue, index = 0 }) {
  if (!clue) return null;

  const cleanContent = (clue.content || '')
    .replace(/(^|[.!?]\s+)the\s+a\s+/gi, '$1A ')
    .replace(/(^|[.!?]\s+)the\s+an\s+/gi, '$1An ')
    .replace(/\bthe\s+a\s+/gi, 'a ')
    .replace(/\bthe\s+an\s+/gi, 'an ')
    .replace(/\ba\s+the\s+/gi, 'the ')
    .replace(/\bthe\s+the\s+/gi, 'the ');

  return (
    <motion.div
      className={s.card}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      <div className={s.header}>
        <span className={s.badge}>
          <span>🔍</span>
          <span>Clue #{index + 1} • Round {clue.round || 1}</span>
        </span>
        <span className={s.timestamp}>Confidential Evidence</span>
      </div>

      <div className={s.content}>{cleanContent}</div>
    </motion.div>
  );
}

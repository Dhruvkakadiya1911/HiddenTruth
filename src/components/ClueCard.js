'use client';

import { motion } from 'framer-motion';
import s from './ClueCard.module.css';

export default function ClueCard({ clue, index = 0 }) {
  if (!clue) return null;

  // Extract optional title from clue object or from start of text
  let title = clue.title || null;
  let text = clue.content || '';

  // If text starts with "**Title:**" or "Title: "
  const titleMatch = text.match(/^(?:\*\*)?(?:Title|Evidence|Clue):\s*([^*\n]+)(?:\*\*)?\n+/i);
  if (!title && titleMatch) {
    title = titleMatch[1].trim();
    text = text.slice(titleMatch[0].length).trim();
  }

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

      {title && <h4 className={s.title}>{title}</h4>}

      <div className={s.content}>{text}</div>

      {clue.narratorComment && (
        <div className={s.comment}>
          <span className={s.commentIcon}>💡</span>
          <span>{clue.narratorComment}</span>
        </div>
      )}
    </motion.div>
  );
}

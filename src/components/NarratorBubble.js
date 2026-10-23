'use client';

import { motion } from 'framer-motion';
import s from './NarratorBubble.module.css';

export default function NarratorBubble({ message, round = 1 }) {
  if (!message) return null;

  return (
    <motion.div
      className={s.bubble}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className={s.header}>
        <div className={s.identity}>
          <span className={s.avatar}>🎙️</span>
          <span className={s.label}>AI Narrator</span>
        </div>
        <span className={s.roundPill}>Round {round}</span>
      </div>

      <p className={s.content}>"{message}"</p>
    </motion.div>
  );
}

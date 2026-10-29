'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AgentFigure from '@/components/AgentFigure';
import s from './HowToPlayModal.module.css';

const CAST_MEMBERS = [
  {
    no: 'No. 01',
    role: 'detective',
    name: 'Detective',
    color: '#2EE6FF',
    bg: '#0A2232',
    border: 'rgba(46,230,255,.5)',
    goal: 'Expose the killer before the vote.',
    ability: 'Gets a private clue each round',
  },
  {
    no: 'No. 02',
    role: 'killer',
    name: 'Killer',
    color: '#FF2D55',
    bg: '#2A0A1E',
    border: 'rgba(255,45,85,.55)',
    goal: 'Blend in. Survive the vote.',
    ability: 'Knows the full truth',
  },
  {
    no: 'No. 03',
    role: 'witness',
    name: 'Witness',
    color: '#FFC93C',
    bg: '#2A1E08',
    border: 'rgba(255,201,60,.5)',
    goal: 'Share what you saw — at the right time.',
    ability: 'Saw a shadow at the scene',
  },
  {
    no: 'No. 04',
    role: 'suspect',
    name: 'Suspect',
    color: '#B76CFF',
    bg: '#22103E',
    border: 'rgba(183,108,255,.55)',
    goal: 'Innocent, but it looks bad. Defend yourself.',
    ability: 'Has a motive and an alibi',
  },
  {
    no: 'No. 05',
    role: 'unknown',
    name: 'Masked',
    color: '#A49CC4',
    bg: '#140E26',
    border: 'rgba(176,156,255,.25)',
    goal: 'How everyone else sees you mid-game.',
    ability: 'Role hidden until the reveal',
  },
];

export default function HowToPlayModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('cast'); // 'cast' | 'rules'

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={s.overlay}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={s.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className={s.header}>
              <div>
                <span className={`mono ${s.subHeader}`}>Nothing is what it seems</span>
                <h1 className={s.title}>Meet the cast</h1>
              </div>
              <div className={s.headerRight}>
                <div className={s.tabGroup}>
                  <button
                    type="button"
                    className={`${s.tabBtn} ${activeTab === 'cast' ? s.tabActive : ''}`}
                    onClick={() => setActiveTab('cast')}
                  >
                    Cast
                  </button>
                  <button
                    type="button"
                    className={`${s.tabBtn} ${activeTab === 'rules' ? s.tabActive : ''}`}
                    onClick={() => setActiveTab('rules')}
                  >
                    Game Flow
                  </button>
                </div>
                <button
                  type="button"
                  className={s.btnClose}
                  onClick={onClose}
                  aria-label="Close Guide"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className={s.desc}>
              Every player gets a secret role. During the game, others appear as a masked silhouette. The mask comes off at the reveal.
            </p>

            {activeTab === 'cast' ? (
              <div className={s.castGrid}>
                {CAST_MEMBERS.map((r) => (
                  <article
                    key={r.name}
                    className={s.castCard}
                    style={{
                      background: r.bg,
                      borderColor: r.border,
                    }}
                  >
                    <span className={`mono ${s.cardNo}`} style={{ color: r.color }}>
                      {r.no}
                    </span>
                    <div className={s.figureWrap}>
                      <AgentFigure role={r.role} size={150} tint={r.color} glow={false} />
                    </div>
                    <div className={s.cardBody}>
                      <div className={s.roleName} style={{ color: r.color }}>
                        {r.name}
                      </div>
                      <div className={s.roleGoal}>{r.goal}</div>
                    </div>
                    <div className={s.abilityBox} style={{ borderColor: r.border }}>
                      <span className={`mono ${s.abilityLabel}`}>Ability</span>
                      <span className={s.abilityText}>{r.ability}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={s.rulesGrid}>
                <div className={s.ruleBox}>
                  <span className={`mono ${s.ruleStep}`}>Step 01</span>
                  <h3 className={s.ruleTitle}>Clues & Crime Scene</h3>
                  <p className={s.ruleDesc}>
                    AI narrates the case and publishes forensic clues round by round. Inspect the evidence board and connect the clues.
                  </p>
                </div>
                <div className={s.ruleBox}>
                  <span className={`mono ${s.ruleStep}`}>Step 02</span>
                  <h3 className={s.ruleTitle}>Interrogation & Alibis</h3>
                  <p className={s.ruleDesc}>
                    Debate in live chat. Ask others where they were at midnight. Spot contradictions and lies in their stories.
                  </p>
                </div>
                <div className={s.ruleBox}>
                  <span className={`mono ${s.ruleStep}`}>Step 03</span>
                  <h3 className={s.ruleTitle}>The Lineup & Final Vote</h3>
                  <p className={s.ruleDesc}>
                    Step into the spotlight. Point at the killer and lock your vote. The suspect with the most votes is arrested.
                  </p>
                </div>
                <div className={s.ruleBox}>
                  <span className={`mono ${s.ruleStep}`}>Step 04</span>
                  <h3 className={s.ruleTitle}>The Grand Reveal</h3>
                  <p className={s.ruleDesc}>
                    All masks are stripped away. Find out who was the killer, who had secrets, and what really happened at midnight.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

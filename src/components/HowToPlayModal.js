'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import s from './HowToPlayModal.module.css';

export default function HowToPlayModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll when open
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className={s.header}>
              <div className={s.headerTitle}>
                <span className={s.headerBadge}>BEGINNER GUIDE</span>
                <h2 className={s.title}>How to Play HiddenTruth</h2>
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

            {/* Navigation Tabs */}
            <div className={s.tabs}>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'overview' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                🎯 The Basics
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'roles' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('roles')}
              >
                🎭 The 4 Roles
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'rounds' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('rounds')}
              >
                ⏱️ Round Flow
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'tips' ? s.tabActive : ''}`}
                onClick={() => setActiveTab('tips')}
              >
                💡 Winning Tips
              </button>
            </div>

            {/* Tab Content */}
            <div className={s.content}>
              {/* Tab 1: The Basics */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={s.section}
                >
                  <div className={s.bannerCard}>
                    <span className={s.bannerIcon}>🕵️‍♂️</span>
                    <div>
                      <h3 className={s.bannerTitle}>A Live AI Murder Mystery with Friends</h3>
                      <p className={s.bannerText}>
                        Someone in your room committed a murder. Each round, an AI Narrator drops fresh crime scene
                        evidence. Your goal is to investigate, question alibis, and catch the real killer before time runs out!
                      </p>
                    </div>
                  </div>

                  <div className={s.stepsList}>
                    <div className={s.stepItem}>
                      <div className={s.stepNumber}>1</div>
                      <div className={s.stepBody}>
                        <h4 className={s.stepTitle}>Receive a Secret Role</h4>
                        <p className={s.stepDesc}>
                          When the game starts, the AI secretly assigns you a role: <strong>Killer</strong>, <strong>Detective</strong>, <strong>Witness</strong>, or <strong>Suspect</strong>. Keep your screen shielded!
                        </p>
                      </div>
                    </div>

                    <div className={s.stepItem}>
                      <div className={s.stepNumber}>2</div>
                      <div className={s.stepBody}>
                        <h4 className={s.stepTitle}>Interrogate in Live Chat</h4>
                        <p className={s.stepDesc}>
                          Each round lasts 3 minutes. Read the new clues on screen and use the room chat to question where everyone was when the murder took place.
                        </p>
                      </div>
                    </div>

                    <div className={s.stepItem}>
                      <div className={s.stepNumber}>3</div>
                      <div className={s.stepBody}>
                        <h4 className={s.stepTitle}>Final Accusation & Vote</h4>
                        <p className={s.stepDesc}>
                          After Round 3, the room enters the Grand Jury Vote. Everyone casts a secret ballot for who they believe is the culprit.
                        </p>
                      </div>
                    </div>

                    <div className={s.stepItem}>
                      <div className={s.stepNumber}>4</div>
                      <div className={s.stepBody}>
                        <h4 className={s.stepTitle}>The Truth Unmasked</h4>
                        <p className={s.stepDesc}>
                          The real killer is revealed! If the room votes for the killer, the <strong>Innocents Win</strong>. If an innocent person is blamed, the <strong>Killer Escapes</strong>!
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: The 4 Roles */}
              {activeTab === 'roles' && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={s.rolesGrid}
                >
                  {/* Killer */}
                  <div className={`${s.roleCard} ${s.roleCardKiller}`}>
                    <div className={s.roleCardHeader}>
                      <span className={s.roleIcon}>🩸</span>
                      <div>
                        <h3 className={s.roleName} style={{ color: 'var(--neon-red)' }}>The Killer</h3>
                        <span className={s.roleTeam}>Evil Team • 1 Player</span>
                      </div>
                    </div>
                    <p className={s.roleGoal}>
                      <strong>Objective:</strong> You committed the crime! Lie about your whereabouts, plant rumors, agree with false theories, and make sure an innocent player takes the blame.
                    </p>
                    <div className={s.roleBadge}>🎯 Win Condition: Avoid being voted out at the end.</div>
                  </div>

                  {/* Detective */}
                  <div className={`${s.roleCard} ${s.roleCardDetective}`}>
                    <div className={s.roleCardHeader}>
                      <span className={s.roleIcon}>🔍</span>
                      <div>
                        <h3 className={s.roleName} style={{ color: 'var(--neon-cyan)' }}>The Detective</h3>
                        <span className={s.roleTeam}>Innocent Team • 1 Player</span>
                      </div>
                    </div>
                    <p className={s.roleGoal}>
                      <strong>Objective:</strong> Lead the interrogation! Cross-reference clues with what people say in chat, find timeline contradictions, and convince others to vote for the true killer.
                    </p>
                    <div className={s.roleBadge}>🎯 Win Condition: Vote out the real killer.</div>
                  </div>

                  {/* Witness */}
                  <div className={`${s.roleCard} ${s.roleCardWitness}`}>
                    <div className={s.roleCardHeader}>
                      <span className={s.roleIcon}>👁️</span>
                      <div>
                        <h3 className={s.roleName} style={{ color: 'var(--neon-amber)' }}>The Witness</h3>
                        <span className={s.roleTeam}>Innocent Team • 1 Player</span>
                      </div>
                    </div>
                    <p className={s.roleGoal}>
                      <strong>Objective:</strong> You saw a crucial piece of evidence or suspicious activity! Help the Detective without being so obvious that the killer notices you.
                    </p>
                    <div className={s.roleBadge}>🎯 Win Condition: Help the room catch the killer.</div>
                  </div>

                  {/* Suspect */}
                  <div className={`${s.roleCard} ${s.roleCardSuspect}`}>
                    <div className={s.roleCardHeader}>
                      <span className={s.roleIcon}>🎭</span>
                      <div>
                        <h3 className={s.roleName} style={{ color: 'var(--neon-violet)' }}>Prime Suspect</h3>
                        <span className={s.roleTeam}>Innocent Team • Remaining Players</span>
                      </div>
                    </div>
                    <p className={s.roleGoal}>
                      <strong>Objective:</strong> You are innocent, but circumstances make you look guilty! Defend your alibi, challenge false claims, and work with friends to find the real killer.
                    </p>
                    <div className={s.roleBadge}>🎯 Win Condition: Survive and unmask the killer.</div>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Round Flow */}
              {activeTab === 'rounds' && (
                <motion.div
                  key="rounds"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={s.section}
                >
                  <div className={s.roundCard}>
                    <div className={s.roundBadge}>ROUND 1 • THE CRIME SCENE</div>
                    <h4 className={s.roundTitle}>The Discovery</h4>
                    <p className={s.roundDesc}>
                      The AI reveals the murder setting, victim, and the initial crime scene clue. Everyone checks their secret dossier and starts questioning where guests were standing when the crime occurred.
                    </p>
                  </div>

                  <div className={s.roundCard}>
                    <div className={s.roundBadge}>ROUND 2 • THE EVIDENCE</div>
                    <h4 className={s.roundTitle}>Cracks in the Alibis</h4>
                    <p className={s.roundDesc}>
                      The host advances the round (or the timer auto-advances). A 2nd critical clue is dropped (e.g., text messages, footprints, dropped items). Stories begin to clash!
                    </p>
                  </div>

                  <div className={s.roundCard}>
                    <div className={s.roundBadge}>ROUND 3 • FINAL ACCUSATIONS</div>
                    <h4 className={s.roundTitle}>The Pressure Mounts</h4>
                    <p className={s.roundDesc}>
                      The 3rd and final clue is revealed. Suspects point fingers using the <strong>🚨 Point Finger</strong> button. Tensions rise as the room prepares for the ballot.
                    </p>
                  </div>

                  <div className={s.roundCard} style={{ borderColor: 'rgba(255, 42, 81, 0.4)' }}>
                    <div className={s.roundBadge} style={{ color: 'var(--neon-red)' }}>VOTING & REVEAL</div>
                    <h4 className={s.roundTitle}>Justice or Murder?</h4>
                    <p className={s.roundDesc}>
                      Voting begins. Every player taps the person they believe committed the crime. Once all votes are cast, the killer's identity, murder weapon, motive, and solution are unmasked!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Tab 4: Winning Tips */}
              {activeTab === 'tips' && (
                <motion.div
                  key="tips"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={s.tipsGrid}
                >
                  <div className={s.tipCard}>
                    <span className={s.tipIcon}>🙈</span>
                    <div>
                      <h4 className={s.tipTitle}>Shield Your Screen</h4>
                      <p className={s.tipDesc}>
                        Use the <strong>🙈 Shield</strong> button on your secret card whenever you're in the same room as friends to prevent screen-peeking.
                      </p>
                    </div>
                  </div>

                  <div className={s.tipCard}>
                    <span className={s.tipIcon}>🗣️</span>
                    <div>
                      <h4 className={s.tipTitle}>Silence is Suspicious</h4>
                      <p className={s.tipDesc}>
                        Players who don't chat or participate almost always get accused! Speak up, explain where you were, and ask questions.
                      </p>
                    </div>
                  </div>

                  <div className={s.tipCard}>
                    <span className={s.tipIcon}>🩸</span>
                    <div>
                      <h4 className={s.tipTitle}>Killer Strategy</h4>
                      <p className={s.tipDesc}>
                        Don't aggressively attack people right away. Act confused, agree with others' theories, and subtly nudge suspicion toward an innocent friend.
                      </p>
                    </div>
                  </div>

                  <div className={s.tipCard}>
                    <span className={s.tipIcon}>🔍</span>
                    <div>
                      <h4 className={s.tipTitle}>Detective Strategy</h4>
                      <p className={s.tipDesc}>
                        Compare timestamps and places. If Clue #2 says the killer was near the balcony, ask each person who they saw near the balcony!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className={s.footer}>
              <button type="button" className={s.btnGotIt} onClick={onClose}>
                Got It, Let's Play! ⚡
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

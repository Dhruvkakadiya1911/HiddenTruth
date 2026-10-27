'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RoleModelCanvas from '@/components/RoleModelCanvas';
import s from './page.module.css';

const ROLES_LIST = [
  {
    id: 'detective',
    title: 'The Detective',
    accentHex: '#B99D73',
    icon: '🔍',
    badge: 'Investigation Lead',
    description:
      'Tan camel trench coat, popped collar, tilted fedora hat with amber band, brass magnifying glass with optical transmission glass lens, and floating 3D beveled Forensic Star Badge (★).',
  },
  {
    id: 'killer',
    title: 'The Killer',
    accentHex: '#c94a4a',
    icon: '🩸',
    badge: 'Secret Culprit',
    description:
      'Obsidian peaked hood with porcelain phantom skull mask, glowing ruby eyes, curved stiletto dagger, glowing poison phial, and floating 3D beveled Skull Emblem (💀).',
  },
  {
    id: 'suspect',
    title: 'Prime Suspect',
    accentHex: '#856c46',
    icon: '🎭',
    badge: 'Person of Interest',
    description:
      'Tailored midnight suit with loosened necktie, translucent 3D crystal sweat drop, floating 3D beveled question mark ("?"), and shifty sideways eye glances.',
  },
  {
    id: 'witness',
    title: 'The Witness',
    accentHex: '#d6be96',
    icon: '👁️',
    badge: 'Key Eyewitness',
    description:
      'Chibi silhouette in a warm earth raincoat with toggle buttons, two wide curious eyes, glowing vintage brass storm lantern, and floating 3D beveled exclamation mark ("!").',
  },
];

export default function ModelShowcasePage() {
  const [size, setSize] = useState('large');
  const [globalHidden, setGlobalHidden] = useState(false);

  // Guarantee Models page always starts strictly at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);
  const [cardHidden, setCardHidden] = useState({
    detective: false,
    killer: false,
    suspect: false,
    witness: false,
  });

  const toggleAll = () => {
    const next = !globalHidden;
    setGlobalHidden(next);
    setCardHidden({
      detective: next,
      killer: next,
      suspect: next,
      witness: next,
    });
  };

  const toggleSingle = (id) => {
    setCardHidden((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className={s.page}>
      {/* Background Ambience */}
      <div className={s.bgLayer}>
        <div className={s.bgGrid} />
        <div className={s.orbCyan} />
        <div className={s.orbCrimson} />
      </div>

      {/* Top Header */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/" className={s.backBtn}>
            ← Back to Game
          </Link>
          <div>
            <span className={s.badge}>3D MODEL INSPECTOR</span>
            <h1 className={s.title}>Role Avatar Showcase</h1>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className={s.toolbar}>
          <div className={s.btnGroup}>
            <button
              type="button"
              className={`${s.toolBtn} ${size === 'large' ? s.activeBtn : ''}`}
              onClick={() => setSize('large')}
            >
              Large (220×260)
            </button>
            <button
              type="button"
              className={`${s.toolBtn} ${size === 'small' ? s.activeBtn : ''}`}
              onClick={() => setSize('small')}
            >
              Small (150×180)
            </button>
          </div>

          <button
            type="button"
            className={`${s.peekAllBtn} ${globalHidden ? s.peekActive : ''}`}
            onClick={toggleAll}
          >
            <span>{globalHidden ? '👁️ Reveal All' : '🙈 Shield All'}</span>
            <span className={s.subText}>(Tests Spring Entrance)</span>
          </button>
        </div>
      </header>

      {/* Interactive Helper Banner */}
      <div className={s.hintBanner}>
        <span>💡 <strong>Tip:</strong> Click & drag horizontally across any figurine to spin it in 360°! Toggle the Shield button to test the spring reveal & color flash.</span>
      </div>

      {/* 4 Models Grid */}
      <main className={s.grid}>
        {ROLES_LIST.map((role) => {
          const isHidden = cardHidden[role.id];
          return (
            <div
              key={role.id}
              className={s.card}
              style={{ '--role-accent': role.accentHex }}
            >
              <div className={s.cardHeader}>
                <span className={s.cardBadge} style={{ color: role.accentHex, borderColor: role.accentHex }}>
                  {role.badge}
                </span>
                <button
                  type="button"
                  className={s.peekBtn}
                  onClick={() => toggleSingle(role.id)}
                >
                  {isHidden ? '👁️ Reveal' : '🙈 Shield'}
                </button>
              </div>

              {/* 3D Model Canvas */}
              <div className={s.canvasContainer}>
                <RoleModelCanvas role={role.id} size={size} hidden={isHidden} />
              </div>

              {/* Role Info */}
              <div className={s.cardBody}>
                <div className={s.titleRow}>
                  <span className={s.roleIcon}>{role.icon}</span>
                  <h2 className={s.roleName} style={{ color: role.accentHex }}>
                    {role.title}
                  </h2>
                </div>
                <p className={s.roleDesc}>{role.description}</p>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

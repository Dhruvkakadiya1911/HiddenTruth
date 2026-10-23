'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import s from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { player, clearPlayer } = usePlayer();

  // Extract roomCode if present in URL
  const match = pathname.match(/\/(lobby|game|vote|reveal)\/([a-zA-Z0-9]+)/);
  const currentPhaseRoute = match ? match[1] : null;
  const activeCode = match ? match[2].toUpperCase() : null;

  const getPhaseMeta = (phase) => {
    switch (phase) {
      case 'lobby':
        return { label: 'Pre-Game Lobby', badgeClass: s.phaseLobby };
      case 'game':
        return { label: 'Active Investigation', badgeClass: s.phaseGame };
      case 'vote':
        return { label: 'Grand Jury Vote', badgeClass: s.phaseVote };
      case 'reveal':
        return { label: 'Truth Unmasked', badgeClass: s.phaseReveal };
      default:
        return null;
    }
  };

  const phaseMeta = currentPhaseRoute ? getPhaseMeta(currentPhaseRoute) : null;

  // Protect running game: Never redirect away from an active investigation on brand click
  const hasActiveGameInUrl = Boolean(activeCode && currentPhaseRoute && currentPhaseRoute !== 'reveal');
  const brandHref = hasActiveGameInUrl
    ? `/${currentPhaseRoute}/${activeCode}`
    : player?.roomCode && pathname === '/'
      ? `/game/${player.roomCode}`
      : '/';

  const handleBrandClick = (e) => {
    if (hasActiveGameInUrl) {
      if (pathname === `/${currentPhaseRoute}/${activeCode}`) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentPhaseRoute === 'reveal') {
      clearPlayer();
    }
  };

  const handleExitRoom = (e) => {
    e.preventDefault();
    if (currentPhaseRoute === 'game' || currentPhaseRoute === 'vote' || currentPhaseRoute === 'lobby') {
      const confirmLeave = window.confirm(
        'Are you sure you want to exit the murder mystery investigation? Your secret role and progress will be abandoned.'
      );
      if (!confirmLeave) return;
    }
    clearPlayer();
    router.push('/', { scroll: true });
  };

  return (
    <nav className={s.navbar}>
      {/* Brand */}
      <div className={s.left}>
        <Link
          href={brandHref}
          onClick={handleBrandClick}
          className={s.brand}
          title={hasActiveGameInUrl ? 'Investigation in Progress' : 'HiddenTruth Home'}
        >
          <span className={s.brandLogo}>HiddenTruth</span>
          <span className={s.brandDot} />
          <span className={s.brandSub}>
            {hasActiveGameInUrl ? 'CASE IN PROGRESS' : 'NOTHING IS WHAT IT SEEMS.'}
          </span>
        </Link>
      </div>

      {/* Center: Room Code & Game Phase */}
      <div className={s.center}>
        {activeCode && (
          <div className={s.roomPill}>
            <span>ROOM</span>
            <span className={s.roomCode}>{activeCode}</span>
          </div>
        )}
        {phaseMeta && (
          <span className={`${s.phaseBadge} ${phaseMeta.badgeClass}`}>
            {phaseMeta.label}
          </span>
        )}
      </div>

      {/* Right: Player Profile & Action */}
      <div className={s.right}>
        {player?.name && activeCode ? (
          <>
            <div className={s.playerChip}>
              <span className={s.playerAvatar}>
                {player.name.charAt(0).toUpperCase()}
              </span>
              <span>{player.name}</span>
              {player.isHost && <span className={s.hostCrown}>👑</span>}
            </div>
            <button
              type="button"
              onClick={handleExitRoom}
              className={s.btnLeave}
            >
              Exit
            </button>
          </>
        ) : (
          <>
            {player?.roomCode && !activeCode ? (
              <Link href={`/game/${player.roomCode}`} className={s.resumePill}>
                <span className={s.resumeDot} />
                <span>Resume Game ({player.roomCode})</span>
              </Link>
            ) : (
              <div className={s.statusBeacon}>
                <span className={s.beaconDot} />
                <span>SYSTEM READY</span>
              </div>
            )}
            {pathname !== '/join' && pathname !== '/create' && (
              <>
                <Link href="/models" className={s.navLink} style={{ color: 'var(--neon-cyan)' }}>
                  3D Models 🎭
                </Link>
                <Link href="/join" className={s.navLink}>
                  Join
                </Link>
                <Link href="/create" className={s.navLink}>
                  Host
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

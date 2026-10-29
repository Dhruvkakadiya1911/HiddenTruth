'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import { supabase } from '@/lib/supabase';
import AgentFigure from '@/components/AgentFigure';
import HowToPlayModal from '@/components/HowToPlayModal';
import s from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const { player, clearPlayer } = usePlayer();
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [dismissResume, setDismissResume] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Ensure scroll top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Verify active room
  useEffect(() => {
    if (!player?.roomCode) {
      setIsRoomActive(false);
      return;
    }

    let isMounted = true;
    async function verifyActiveRoom() {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('status')
          .eq('code', player.roomCode.toUpperCase())
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data || data.status === 'finished') {
          clearPlayer();
          setIsRoomActive(false);
        } else {
          setIsRoomActive(true);
        }
      } catch (err) {
        console.error('Room verification error:', err);
      }
    }

    verifyActiveRoom();
    return () => {
      isMounted = false;
    };
  }, [player?.roomCode, clearPlayer]);

  return (
    <div className={s.container}>
      {/* ── Atmospheric FX (Web.dc.html) ── */}
      <div aria-hidden="true" className={s.atmosphere}>
        <div className={s.fog} />
        <div className={s.cyanGlow} />
        <div className={s.rain} />
        <div className={s.flashbg} />
      </div>
      <div aria-hidden="true" className={s.grainOverlay}>
        <div className={s.grain} />
      </div>
      <div aria-hidden="true" className={s.vignetteOverlay} />

      {/* ── Header (Web.dc.html) ── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.brand}>
            <span className={s.brandDot} />
            <span className={s.brandTitle}>
              Hidden<span className={s.brandRed}>Truth</span>
            </span>
          </Link>

          <nav className={s.headerNav}>
            {player?.roomCode && isRoomActive && (
              <Link href={`/game/${player.roomCode}`} className={s.chipResume}>
                <span className={s.beatDotCyan} />
                Resume {player.roomCode}
              </Link>
            )}
            <Link href="/join" className={s.chip}>
              Join
            </Link>
            <Link href="/create" className={s.chipHost}>
              Host
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero Screen (Web.dc.html) ── */}
      <div className={s.heroScr}>
        {/* Crime scene caution tape angled in background (z-index 0) */}
        <div aria-hidden="true" className={s.tapeWrap}>
          <div className={s.tape}>
            <span>Crime scene · do not cross · trust no one · crime scene · do not cross · trust no one · crime scene · do not cross · trust no one ·&nbsp;</span>
            <span>Crime scene · do not cross · trust no one · crime scene · do not cross · trust no one · crime scene · do not cross · trust no one ·&nbsp;</span>
          </div>
        </div>

        {/* Content container (z-index 1) */}
        <div className={s.heroWrap}>
          {/* Left Column: Heading & Controls */}
          <div className={s.heroLeft}>
            <span className={`${s.mono} ${s.rise} ${s.eyebrow}`}>
              <span className={s.beatDot} />
              An AI-narrated murder mystery
            </span>

            <h1 className={`${s.disp} ${s.rise} ${s.r1} ${s.glitch} ${s.heroTitle}`}>
              Someone<br />
              here is <span className={s.lyingHighlight}>lying.</span>
            </h1>

            <p className={`${s.rise} ${s.r2} ${s.heroSubtitle}`}>
              A live murder mystery for 3–10 friends, each on their own phone. The AI writes a fresh case, deals secret roles and narrates every twist. One of you did it.
            </p>

            <div className={`${s.rise} ${s.r3} ${s.heroCtas}`}>
              <Link href="/create" className={s.bRed}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                </svg>
                Host a game
              </Link>
              <Link href="/join" className={s.bGhost}>
                Join with a code
              </Link>
            </div>

            <div className={`${s.rise} ${s.r4} ${s.chipList}`}>
              <span className={s.chip} style={{ cursor: 'default' }}>3–10 players</span>
              <span className={s.chip} style={{ cursor: 'default' }}>~15 minutes</span>
              <span className={s.chip} style={{ cursor: 'default' }}>No download</span>
              <span className={s.chip} style={{ cursor: 'default' }}>New story every game</span>
            </div>
          </div>

          {/* Right Column: Visual with Overhead Interrogation Lamp, Sweeping Spotlight & Floating Clues */}
          <div className={`${s.rise} ${s.r2} ${s.heroRight}`}>
            {/* Overhead Interrogation Lamp Assembly */}
            <div aria-hidden="true" className={s.lampRig}>
              <div className={s.ceilingMount} />
              <div className={s.lampCord} />
              <div className={s.lampFixture}>
                <svg
                  width="68"
                  height="46"
                  viewBox="0 0 68 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={s.lampSvg}
                >
                  {/* Top cord clamp / screw collar */}
                  <rect x="30" y="2" width="8" height="6" rx="1.5" fill="#3E3D4C" stroke="#5D5B6E" strokeWidth="1" />
                  {/* Socket housing */}
                  <rect x="27" y="7" width="14" height="4" rx="1" fill="#24232E" stroke="#3D3C4B" strokeWidth="0.8" />
                  {/* Conical Bell Lampshade (Noir industrial vintage design) */}
                  <path
                    d="M27 11 L6 38 C6 40 8.5 41.5 12 41.5 L56 41.5 C59.5 41.5 62 40 62 38 L41 11 Z"
                    fill="url(#lampMetalGrad)"
                    stroke="#474558"
                    strokeWidth="1.2"
                  />
                  {/* Outer metallic rim highlight */}
                  <ellipse cx="34" cy="41" rx="26" ry="4" fill="#15141D" stroke="#5C5A6E" strokeWidth="1" />
                  {/* Inner reflective reflector bowl */}
                  <ellipse cx="34" cy="40.5" rx="20" ry="3" fill="#2E1218" stroke="#E5193A" strokeWidth="0.8" strokeOpacity="0.6" />
                  {/* Glowing bulb & incandescent core */}
                  <ellipse cx="34" cy="40" rx="11" ry="2.2" fill="#FF2D55" />
                  <ellipse cx="34" cy="39.5" rx="5" ry="1.4" fill="#FFF0F3" />
                  <defs>
                    <linearGradient id="lampMetalGrad" x1="6" y1="11" x2="62" y2="41.5" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#3C3A4D" />
                      <stop offset="30%" stopColor="#282635" />
                      <stop offset="70%" stopColor="#1B1925" />
                      <stop offset="100%" stopColor="#12111A" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className={s.lampGlowAura} />
              <div className={s.sweepBeam} />
            </div>
            <AgentFigure role="killer" size={400} glow={false} tilt={false} />

            <span className={`${s.card} ${s.float1} ${s.badgeTod}`}>
              <span className={s.mono} style={{ color: '#F2B33D' }}>T.O.D.</span>
              <span>11:35 PM</span>
            </span>

            <span className={`${s.card} ${s.float2} ${s.badgeExhibit}`}>
              <span className={s.mono} style={{ color: '#F2B33D' }}>Exhibit B</span>
              <span>Wet footprints</span>
            </span>

            <span className={`${s.tw} ${s.float3} ${s.typewriterNote}`}>
              &ldquo;Who poured the last drink?&rdquo;
            </span>

            {/* Active Session Resume Popup if player has an active room */}
            {player?.roomCode && isRoomActive && !dismissResume && (
              <div className={s.resumePopup}>
                <div className={s.resumePopupHeader}>
                  <div className={s.resumeTagLine}>
                    <span className={s.beatDotCyan} />
                    Active Investigation
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissResume(true)}
                    className={s.btnDismiss}
                    title="Dismiss alert"
                    aria-label="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
                <div className={s.resumeRoomTitle}>Room {player.roomCode}</div>
                <p className={s.resumeRoomText}>
                  You have an active case in progress as <strong>{player.name}</strong>.
                </p>
                <div className={s.resumeActions}>
                  <Link href={`/game/${player.roomCode}`} className={s.btnResumeAction}>
                    Resume Case ⚡
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearPlayer();
                      setIsRoomActive(false);
                    }}
                    className={s.btnLeaveAction}
                  >
                    Leave
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom running ECG heartbeat line */}
        <div className={s.ecgWrap}>
          <svg aria-hidden="true" width="100%" height="40" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ display: 'block' }}>
            <path
              className={s.ecg}
              d="M0 20 H600 L620 20 L634 4 L648 36 L662 10 L672 20 H1440"
              fill="none"
              stroke="#E5193A"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      {/* ── Section E: How It Plays ── */}
      <section id="how" className={s.howSection}>
        <div className={s.sectionHeaderRow}>
          <div>
            <span className={s.sectionLabel} style={{ color: '#2EE6FF' }}>
              How a round plays
            </span>
            <h2 className={s.sectionTitle}>Four beats. One liar.</h2>
          </div>
          <p className={s.sectionDesc}>
            Each game takes 15 minutes across four fast rounds. Clues drop live, stories clash,
            and the clock never stops ticking down.
          </p>
        </div>

        <div className={s.stepsGrid}>
          {/* Dashed connector line */}
          <svg className={s.stepsLineSvg} viewBox="0 0 1000 2" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="1" x2="1000" y2="1" stroke="rgba(176,156,255,0.25)" strokeWidth="2" className="dash" />
          </svg>

          {/* Step 1 */}
          <div className={`glass step ${s.stepCard}`}>
            <div className={s.stepBadge} style={{ background: 'linear-gradient(135deg, #2EE6FF, #7B6CFF)', color: '#0A0716', boxShadow: '0 12px 26px -10px rgba(46,230,255,.9)' }}>
              01
            </div>
            <h3 className={s.stepTitle}>The Body Falls</h3>
            <p className={s.stepText}>
              AI narrates the crime scene. Everyone gets their confidential role on their own phone.
            </p>
            <span className={s.stepTag} style={{ color: '#2EE6FF' }}>
              00:00 · THE OPENING
            </span>
          </div>

          {/* Step 2 */}
          <div className={`glass step ${s.stepCard}`}>
            <div className={s.stepBadge} style={{ background: 'linear-gradient(135deg, #FFC93C, #FF7A3D)', color: '#1A0F00', boxShadow: '0 12px 26px -10px rgba(255,201,60,.9)' }}>
              02
            </div>
            <h3 className={s.stepTitle}>The Clues Drop</h3>
            <p className={s.stepText}>
              Fresh forensic intel hits the room each round — weapon traces, time alibis, and whispers.
            </p>
            <span className={s.stepTag} style={{ color: '#FFC93C' }}>
              ROUND 1–3 · LIVE INTEL
            </span>
          </div>

          {/* Step 3 */}
          <div className={`glass step ${s.stepCard}`}>
            <div className={s.stepBadge} style={{ background: 'linear-gradient(135deg, #B76CFF, #FF6BB5)', color: '#FFFFFF', boxShadow: '0 12px 26px -10px rgba(183,108,255,.9)' }}>
              03
            </div>
            <h3 className={s.stepTitle}>The Cross-Exam</h3>
            <p className={s.stepText}>
              Question everyone. Who touched the glass? Whose shoes are soaked? Spot who starts stuttering.
            </p>
            <span className={s.stepTag} style={{ color: '#B76CFF' }}>
              ARGUE · DEFEND
            </span>
          </div>

          {/* Step 4 */}
          <div className={`glass step ${s.stepCard}`}>
            <div className={s.stepBadge} style={{ background: 'linear-gradient(135deg, #FF2D55, #FF7A3D)', color: '#FFFFFF', boxShadow: '0 12px 26px -10px rgba(255,45,85,.9)' }}>
              04
            </div>
            <h3 className={s.stepTitle}>The Accusation</h3>
            <p className={s.stepText}>
              Head to the lineup wall. Lock your vote in before the timer expires. Most accused gets arrested.
            </p>
            <span className={s.stepTag} style={{ color: '#FF2D55' }}>
              FINAL VOTE · THE REVEAL
            </span>
          </div>
        </div>
      </section>

      {/* ── Section F: The Cast ── */}
      <section id="cast" className={s.castSection}>
        <div className={s.castHeaderCentered}>
          <span className={s.sectionLabel} style={{ color: '#B76CFF' }}>
            Confidential Dossiers
          </span>
          <h2 className={s.sectionTitle}>Four souls. One with blood on their hands.</h2>
          <p className={s.sectionDesc} style={{ textAlign: 'center' }}>
            Every player is secretly dealt one role. Nobody knows who is who until the final unmasking.
          </p>
        </div>

        <div className={s.rolesGrid}>
          {/* Detective */}
          <div
            className={`role ${s.roleFrame}`}
            style={{
              background: 'linear-gradient(160deg, rgba(46,230,255,.85), rgba(46,230,255,.08) 55%, rgba(46,230,255,.3))',
            }}
          >
            <div
              className={s.roleInner}
              style={{
                background: 'radial-gradient(220px 240px at 50% 22%, rgba(46,230,255,.22), #120C26 70%)',
              }}
            >
              <AgentFigure role="detective" size={180} tilt={true} />
              <h3 className={s.roleTitle} style={{ color: '#2EE6FF' }}>The Detective</h3>
              <p className={s.roleGoal}>
                Connect the forensic dots, expose the contradiction, and convince the jury.
              </p>
            </div>
          </div>

          {/* The Killer */}
          <div
            className={`role ${s.roleFrame}`}
            style={{
              background: 'linear-gradient(160deg, rgba(255,45,85,.85), rgba(255,45,85,.08) 55%, rgba(255,45,85,.3))',
            }}
          >
            <div
              className={s.roleInner}
              style={{
                background: 'radial-gradient(220px 240px at 50% 22%, rgba(255,45,85,.22), #120C26 70%)',
              }}
            >
              <AgentFigure role="killer" size={180} tilt={true} />
              <h3 className={s.roleTitle} style={{ color: '#FF2D55' }}>The Killer</h3>
              <p className={s.roleGoal}>
                Lie convincingly, deflect suspicion onto others, and survive the final lineup vote.
              </p>
            </div>
          </div>

          {/* The Witness */}
          <div
            className={`role ${s.roleFrame}`}
            style={{
              background: 'linear-gradient(160deg, rgba(255,201,60,.85), rgba(255,201,60,.08) 55%, rgba(255,201,60,.3))',
            }}
          >
            <div
              className={s.roleInner}
              style={{
                background: 'radial-gradient(220px 240px at 50% 22%, rgba(255,201,60,.22), #120C26 70%)',
              }}
            >
              <AgentFigure role="witness" size={180} tilt={true} />
              <h3 className={s.roleTitle} style={{ color: '#FFC93C' }}>The Witness</h3>
              <p className={s.roleGoal}>
                You caught a fleeting glimpse of the crime. Share your piece without becoming a target.
              </p>
            </div>
          </div>

          {/* The Suspect */}
          <div
            className={`role ${s.roleFrame}`}
            style={{
              background: 'linear-gradient(160deg, rgba(183,108,255,.85), rgba(183,108,255,.08) 55%, rgba(183,108,255,.3))',
            }}
          >
            <div
              className={s.roleInner}
              style={{
                background: 'radial-gradient(220px 240px at 50% 22%, rgba(183,108,255,.22), #120C26 70%)',
              }}
            >
              <AgentFigure role="suspect" size={180} tilt={true} />
              <h3 className={s.roleTitle} style={{ color: '#B76CFF' }}>The Suspect</h3>
              <p className={s.roleGoal}>
                You look guilty as hell, but you didn&apos;t do it. Defend your alibi and redirect the heat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section G: Why It's Fun (Bento Grid) ── */}
      <section id="why" className={s.bentoSection}>
        {/* Card 1: AI Narrator */}
        <div className={`glass ${s.bentoColSpan2} ${s.aiCard}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eq" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span />
              <span style={{ animationDelay: '0.2s' }} />
              <span style={{ animationDelay: '0.4s' }} />
            </span>
            <span className="mono" style={{ fontSize: 11, color: '#FF8AA2' }}>
              DYNAMIC STORYTELLING
            </span>
          </div>
          <h3 className={s.bentoTitle} style={{ fontSize: 26 }}>
            An AI host that reacts to your group&apos;s chaos
          </h3>
          <p className={s.bentoText}>
            No static murder mystery box with paper scripts. Gemini generates bespoke clues, motives,
            and dramatic unmaskings tailored to whoever is playing.
          </p>
          <div className={s.narratorQuoteBox}>
            “The terrace door swung open. Rain blew into the penthouse. And someone in wet loafers was
            quietly reaching into Julian&apos;s briefcase…”
          </div>
        </div>

        {/* Card 2: Zero App Downloads */}
        <div className={`glass ${s.bentoCard}`}>
          <div className={s.bentoIconBox} style={{ background: 'linear-gradient(135deg, #2EE6FF, #7B6CFF)' }}>
            📱
          </div>
          <h3 className={s.bentoTitle}>Zero App Downloads</h3>
          <p className={s.bentoText}>
            Join instantly from Safari, Chrome, or any browser with a simple 4-letter room code.
            Works smoothly across iPhones, Android, and laptops.
          </p>
        </div>

        {/* Card 3: Secret Roles */}
        <div className={`glass ${s.bentoCard}`}>
          <div className={s.bentoIconBox} style={{ background: 'linear-gradient(135deg, #FFC93C, #FF7A3D)' }}>
            🎭
          </div>
          <h3 className={s.bentoTitle}>Private Intel on Screen</h3>
          <p className={s.bentoText}>
            Only you can see your secret role and private motives. Hide your screen with one tap
            whenever a friend peeks over your shoulder.
          </p>
        </div>

        {/* Card 4: CTA Banner */}
        <div className={`glass ${s.bentoColSpan2} ${s.ctaCard}`}>
          <div>
            <h3 className={s.ctaCardTitle}>Ready to lie to your friends?</h3>
            <p className={s.ctaCardText}>
              Start a private room in 10 seconds. Invite 3–10 players and find the killer.
            </p>
          </div>
          <Link href="/create" className={`btn shine ${s.btnHostHero}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Host a game
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={s.brandDot} />
            <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: 16 }}>
              Hidden<span style={{ color: '#FF2D55' }}>Truth</span>
            </span>
            <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
            <span className="mono" style={{ fontSize: 11 }}>Nothing is what it seems.</span>
          </div>

          <div>Built for game night · 3–10 players · 15 min rounds</div>
        </div>
      </footer>

      {/* How to Play Beginner Guide Modal */}
      <HowToPlayModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

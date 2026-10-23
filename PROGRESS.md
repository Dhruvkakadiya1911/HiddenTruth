# PROGRESS

## Steps Checklist

- [x] **Step 1** — Project Scaffold & Global Styles
- [x] **Step 2** — Supabase Setup & Database Tables
- [x] **Step 3** — Room Creation API & Page
- [x] **Step 4** — Join Room API & Page
- [x] **Step 5** — Lobby Page with Realtime Player List
- [x] **Step 6** — AI Narrator: Scenario Generation
- [x] **Step 7** — Game Screen Layout & Role Reveal
- [x] **Step 8** — Round System & Clue Delivery
- [x] **Step 9** — Chat / Discussion System
- [x] **Step 10** — Accusation System
- [x] **Step 11** — Voting Page
- [x] **Step 12** — Reveal Page & Dramatic Finale
- [x] **Step 13** — Timer Component
- [x] **Step 14** — Navbar & Navigation Polish
- [x] **Step 15** — Error Handling, Edge Cases & Polish
- [ ] **Step 16** — Deploy to Vercel


---

## Decisions Made

- Initialized Next.js 14 App Router in pure JavaScript with Framer Motion, Supabase JS, and Zod dependencies.
- Setup mobile-first CSS architecture with CSS variables in `globals.css` and CSS module `page.module.css`.
- Upgraded aesthetic to a high-energy Gen-Z Neo-Noir theme: Outfit + Space Grotesk fonts, animated caution-tape marquee ticker, pulsing AI equalizer live badge, floating ambient blur orbs, and tactile glass action cards.
- Configured Supabase browser (`supabase.js`) and server (`supabaseServer.js`) clients with fallback support for publishable and anon keys.
- Created all 6 database tables (`rooms`, `players`, `clues`, `accusations`, `votes`, `messages`) with RLS policies and Realtime replication enabled.
- Built 4-letter room code generator with unambiguous character set (excludes confusing characters I, O, 0, 1).
- Built Room creation API (`/api/rooms`) creating both room and host player with foreign key linking.
- Implemented `PlayerContext` and `usePlayer` hook with `localStorage` persistence.
- Built host creation screen (`/create`) with neo-noir form, character counter, loading animation, and error feedback.
- Built Join Room API (`/api/join`) with code validation, capacity enforcement (max 10), state verification (waiting only), and duplicate name prevention.
- Built Join screen (`/join`) with prominent 4-character monospace code input, error animations, and automatic lobby navigation.
- Created `PlayerCard` component with avatar initial, host badge, and animated entry.
- Built `useSupabaseRoom` hook subscribing to Supabase Realtime channel for live player joins, leaves, and room state changes.
- Built `/lobby/[code]` page with 4-letter code copy button, live player roster, min-player requirement alerts, and host "Start Investigation" button.
- Selected Google Gemini as the LLM provider (`@google/generative-ai`), with `GEMINI_API_KEY` in `.env.local`. Updated candidate model to `gemini-3.5-flash` with automatic fallback cascade.
- Created Zod schemas in `schemas.js` for strict mystery scenario validation.
- Built `ai.js` with structured Gemini prompt and high-quality offline fallback scenario generator.
- Built `/api/game/start` endpoint which generates mystery scenario, assigns secret roles (killer, detective, witness, suspects), updates database tables, and seeds initial clue & narrator intro message.
- Built `NarratorBubble` component displaying AI narration with custom glow styling.
- Implemented `useGameState` hook synchronizing room updates, individual player's secret role, clues, and messages via Supabase Realtime.
- Built `/game/[code]` screen with secret role reveal animation, privacy peek shield toggle (hide/reveal secret info so friends can't glance at each other's phones), scenario header, evidence log, and suspects roster.
- Added `clueSchema` to `schemas.js` and implemented `generateRoundClue` with Gemini and fallback support.
- Built `/api/game/clue` endpoint to increment rounds, generate dynamic clues, add AI narrator reactions, and transition to voting on final round.
- Created `ClueCard` component with animated entry, and added host round advance controls to `/game/[code]`.
- Built `/api/chat` endpoint validating and recording discussion messages.
- Added live Interrogation Thread to `/game/[code]` with visual bubble differentiation for players vs AI Narrator and automatic scroll to newest messages.
- Added `accusationResponseSchema` in `schemas.js` and `buildAccusationPrompt` in `prompts.js` with fallback in `ai.js`.
- Created `/api/game/accuse` endpoint to save accusations to database and insert live accusation broadcast & dramatic AI Narrator reaction messages into the interrogation thread.
- Added "Point Finger" accusation modal and red alert bubble styling to `/game/[code]`.
- Built `/api/vote` route handling vote submissions, preventing duplicate votes via database constraints, and retrieving room vote tallies.
- Built `VotePanel` component with interactive suspect selection cards and verdict lock-in states.
- Created `/vote/[code]` page with crime scene briefing, live progress bar, Supabase Realtime synchronization on `votes` and `rooms`, and host finale reveal controls.
- Added `revealSchema` in `schemas.js` and `buildRevealPrompt` in `prompts.js` with fallback in `ai.js`.
- Built `/api/reveal` endpoint to compute final jury tallies, identify killer, determine group victory status, and generate dramatic AI Narrator closing monologue.
- Built `RevealScene` component featuring dramatic win/loss status banner, unmasked culprit dossier with weapon/motive, case debrief monologue, full jury vote tally, and unmasked player roles.
- Built `/reveal/[code]` finale page with atmospheric neo-noir styling.
- Added `TIMER_CONFIG` to `constants.js` specifying 180s round duration and 120s ballot duration.
- Built `Timer` component with neo-noir glowing pill styling, adaptive warning states (amber <45s, critical pulsing red <15s), and time-expired banner.
- Integrated `Timer` into the top navigation of `/game/[code]` (with round-change auto-reset) and `/vote/[code]`.
- Built unified `Navbar` component in `src/components/Navbar.js` with route-aware game phase badges (`LOBBY`, `ACTIVE INVESTIGATION`, `GRAND JURY VOTE`, `TRUTH UNMASKED`), active room code pill, player profile badge with host crown, and confirmation-protected exit handler.
- Integrated `Navbar` globally into `src/app/layout.js`.
- Implemented state-machine navigation guards across `/lobby/[code]`, `/game/[code]`, `/vote/[code]`, and `/reveal/[code]` ensuring invalid access redirects to `/join?code=XXXX` or the correct active game phase.
- Built `LoadingSpinner` radar component replacing unstyled text across all asynchronous page transitions.
- Created custom neo-noir 404 page (`src/app/not-found.js`) and root ErrorBoundary (`src/app/error.js`) for graceful client recovery.
- Added comprehensive error handling and status code validation across all API routes and client Supabase subscriptions.
- Enhanced landing page (`/`) with interactive neo-noir animations: dynamic cursor spotlight torch, animated multi-bar AI voice equalizer, live typewriter tagline cycler, floating feature tags, and real-time case dialogue simulation feed.
- Added interactive Floating 3D Clue Cards & Suspect Polaroids to the home page with physics-based floating, 3D hover tilt, tape strips, evidence stamps, and an interactive clickable secret role peek dossier.
- Removed `three` from `transpilePackages` in `next.config.js` to ensure Three.js is bundled purely on the client side without triggering server-side vendor chunk cache errors.
- Cleaned up dangling elements in `src/app/page.js` and cleared out the conflicting `.next` cache.
- Re-launched clean background development server with verified HTTP 200 responses on `/`, `/create`, and `/join`.
- Rebuilt 3D Watcher model with realistic human anatomical proportions: replaced low-poly polyhedron crystal with smooth human cranium, defined jawline and chin, sculpted cheekbones, ears, nose (bridge, tip, nostrils), lips, arched eyebrows, and gold-rimmed noir aviator sunglasses with reflective polarized lenses.
- Added tailored human attire: crisp white dress shirt collar, crimson silk necktie with knot, structured wool suit jacket with peaked lapels, and deltoid shoulder caps.
- Upgraded fedora hat with authentic detective curvature: pinched crown with center crease and side indents, organically swooping brim, and glowing crimson band.
- Implemented biomechanical head-and-torso tracking lerp: head turns dynamically toward cursor while shoulders follow naturally.
- Created `RoleModelCanvas` component (`src/components/RoleModelCanvas.js`) with 4 procedural Three.js 3D character busts — one per game role (Killer: dark cowl + red slit-eyes + crimson dagger; Detective: fedora + aviator glasses + magnifying glass; Witness: oversized eye + hoodie + defensive fists; Suspect: theatrical mask + floating question mark). Each has role-specific dramatic lighting, idle animations, and inset CSS glow overlays. Accepts `role` and `size` (`large`/`small`) props.
- Integrated `RoleModelCanvas` into the Secret Role Reveal card on `/game/[code]` — the 3D bust replaces the emoji icon next to the player's secret identity title.
- Integrated `RoleModelCanvas` into `RevealScene` component — large Killer 3D model replaces the emoji avatar in the culprit dossier, and small role models appear alongside each player's unmasked identity in the roster grid.
- Redesigned `RoleModelCanvas` into a cohesive collection of 4 noir designer vinyl collectible figurines (Detective, Killer, Prime Suspect, Witness) with shared base structure, plinth, contact shadow, proper eyes with blinking rig, optical glass lens (MeshPhysicalMaterial with transmission), 3D extruded/beveled floating '?' and '!' icons, sweat drop, 3-point lighting + accent rim lights, drag-to-rotate with damping, and privacy shield blur.
- Removed `framer-motion`, `motion-dom`, and `motion-utils` from `transpilePackages` in `next.config.js` to fix the Next.js webpack server runtime error (`Cannot find module './vendor-chunks/motion-dom.js'`). Client components consume `framer-motion` natively without requiring server vendor-chunk transpilation.
- Created direct 3D Model Inspector page at `/models` (`src/app/models/page.js` and `page.module.css`) to view and test all 4 role avatars side-by-side with 360° drag rotation, size toggle (`large`/`small`), and global/individual privacy shield reveal tests without needing to launch a multiplayer game session. Added navigation shortcut to `Navbar.js`.
- Redesigned and upgraded the Killer 3D model into an ominous Noir Phantom Assassin: sculpted cowl with pointed visor peak, bone-white porcelain phantom skull half-mask with cheekbones and sharp jawline, two piercing ruby eyes with dark pupils, layered shoulder mantle with silver studs, two-tone cloak with rich crimson velvet inner lining, silver chest chain with glowing ruby talisman, tactical belt with skull buckle, curved ceremonial damascus steel stiletto dagger with silver skull pommel and arterial blood drip, glowing lethal poison phial in the left hand with PointLight, and an overhead floating 3D beveled skull emblem.
- Added a unique floating 3D overhead symbol for the Detective to complete the role insignia set: a beveled 5-point Forensic Star Badge (★) with a hollow core and a glowing cyan jewel emitter (`#22d3ee`). It floats and bobs overhead with smooth rotational oscillation, harmonizing with the Killer's floating skull emblem (💀), the Suspect's question mark (`?`), and the Witness's exclamation mark (`!`). Updated `src/components/RoleModelCanvas.js`, `public/showcase.html`, and `src/app/models/page.js`.
- Fixed active game route persistence and brand navigation protection:
  - In `Navbar.js`, the top-left `HiddenTruth` brand logo now checks if an active game is in progress (`lobby`, `game`, or `vote`) and links directly to the current game phase route instead of dumping the player to `/`.
  - Added click prevention on the brand logo when on the active game page to prevent disruption.
  - Added a neon glowing `[Resume Game: CODE]` button to `Navbar.js` when the user is outside the room but has an active game session in `localStorage`.
  - Added an `Active Investigation` resume card to `src/app/page.js` hero panel so players can jump straight back into an ongoing session with one click.
  - Guarded in-game and lobby exit buttons with confirmation dialogs to prevent accidental progress abandonment.
- Fixed role distribution and balance:
  - Added programmatic `enforceRoleDistribution()` in `src/lib/ai.js` guaranteeing that every game with 3+ players ALWAYS has exactly 1 Killer, 1 Detective, and 1 Witness, with all remaining players (4th player onwards) assigned as Prime Suspects.
  - Hardened player role assignment in `/api/game/start` with case/trim normalization and index fallback so no player can ever be left with an unassigned (`null`) role that defaulted to Prime Suspect.
- Implemented Idea 1: Automatic Round Advance & Voting Transition:
  - In `src/app/game/[code]/page.js` and `page.module.css`: When the investigation timer reaches `00:00`, a dramatic neo-noir auto-advance countdown banner triggers with a 5-second countdown (`5s... 4s... 3s... 2s... 1s`). At 0s, the game automatically advances to the next round with a new forensic clue, and in the final round (Round 3) automatically transitions all players to the Grand Jury Ballot (`/vote/[code]`). Includes an immediate "Advance Now ⚡" button for the host and a safety fallback if the host disconnects.
  - In `src/app/vote/[code]/page.js` and `page.module.css`: When the 2-minute ballot timer expires, a matching 5-second auto-reveal countdown triggers, automatically transitioning all players to Truth Unmasked (`/reveal/[code]`) so deliberations never stall.
- Fixed duplicate clues per round and persistent timer synchronization across refreshes:
  - Added concurrency guards in `src/app/api/game/clue/route.js`: validates `currentRound` and verifies whether a clue for `nextRound` already exists before generating/inserting another clue to prevent race conditions from creating multiple clues for the same round.
  - Added frontend clue deduplication by round in `src/app/game/[code]/page.js` so only 1 clue per round is rendered even if duplicate historical records exist in the database.
  - Upgraded `Timer.js` with `startedAt` and `totalSeconds` props: computes true elapsed time from server timestamps (`scenario.round_X_started_at` / `clue.created_at` / `localStorage`). Refreshing or switching tabs no longer restarts the timer back to 03:00.
- Fixed stale "Active Investigation" card appearing after game completion:
  - In `src/components/RevealScene.js`: "Play Another Mystery 🕵️" now calls `clearPlayer()` to cleanly clear the finished room session before routing to `/`.
  - In `src/components/Navbar.js`: Navigating away from `/reveal/[code]` clears completed game state.
  - In `src/app/page.js`: Automatically verifies room status in Supabase; if the room has status `finished`, the old session is automatically purged so the "Active Investigation" resume card never appears for concluded mysteries. Added a manual "Dismiss" (✕) and "Leave" button to the card for easy control.










---

## Known Issues

- Host machine default `node` binary is v10; modern Node runtime (v20+) is sourced from `~/.nvm/versions/node/v20.20.2/bin` or `v22.17.1`.

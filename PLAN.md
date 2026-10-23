# AI Murder Mystery Party Game — PLAN

## Project Summary

A mobile-first party game where friends join a room via a 4-letter code on their phones. An AI narrator generates a murder mystery scenario, secretly assigns roles (killer, detective, witness, suspects), reveals clues each round, reacts to player accusations, and culminates in a group vote and dramatic reveal. Built with Next.js (App Router, plain JS), Supabase (Postgres + Realtime), Framer Motion, and an LLM API.

---

## Folder Structure

```
Game/
├── .env.local                    # All secrets & URLs
├── next.config.js
├── package.json
├── jsconfig.json
├── PLAN.md
├── PROGRESS.md
├── RULES.md
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.js             # Root layout (global fonts, metadata)
│   │   ├── page.js               # Landing / home page
│   │   ├── page.module.css
│   │   ├── globals.css           # Global styles + CSS variables
│   │   ├── create/
│   │   │   ├── page.js           # Host creates a room
│   │   │   └── page.module.css
│   │   ├── join/
│   │   │   ├── page.js           # Player enters room code
│   │   │   └── page.module.css
│   │   ├── lobby/[code]/
│   │   │   ├── page.js           # Waiting room before game starts
│   │   │   └── page.module.css
│   │   ├── game/[code]/
│   │   │   ├── page.js           # Main game screen (rounds, clues, chat)
│   │   │   └── page.module.css
│   │   ├── vote/[code]/
│   │   │   ├── page.js           # Voting screen
│   │   │   └── page.module.css
│   │   ├── reveal/[code]/
│   │   │   ├── page.js           # Dramatic reveal & results
│   │   │   └── page.module.css
│   │   └── api/
│   │       ├── rooms/
│   │       │   └── route.js      # POST: create room, GET: room info
│   │       ├── join/
│   │       │   └── route.js      # POST: join a room
│   │       ├── game/
│   │       │   ├── start/
│   │       │   │   └── route.js  # POST: host starts game → AI generates scenario
│   │       │   ├── clue/
│   │       │   │   └── route.js  # POST: advance round, get next clue
│   │       │   └── accuse/
│   │       │       └── route.js  # POST: player makes an accusation
│   │       ├── vote/
│   │       │   └── route.js      # POST: cast vote, GET: results
│   │       └── reveal/
│   │           └── route.js      # GET: final reveal data
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── Navbar.module.css
│   │   ├── PlayerCard.js
│   │   ├── PlayerCard.module.css
│   │   ├── ClueCard.js
│   │   ├── ClueCard.module.css
│   │   ├── NarratorBubble.js
│   │   ├── NarratorBubble.module.css
│   │   ├── VotePanel.js
│   │   ├── VotePanel.module.css
│   │   ├── Timer.js
│   │   ├── Timer.module.css
│   │   ├── RevealScene.js
│   │   └── RevealScene.module.css
│   ├── hooks/
│   │   ├── useSupabaseRoom.js    # Realtime subscription for room state
│   │   ├── useGameState.js       # Realtime subscription for game state
│   │   └── usePlayer.js          # Current player context from localStorage
│   ├── lib/
│   │   ├── supabase.js           # Supabase client (browser)
│   │   ├── supabaseServer.js     # Supabase client (server / API routes)
│   │   ├── ai.js                 # LLM API wrapper
│   │   ├── prompts.js            # All AI prompt templates
│   │   ├── schemas.js            # Zod schemas for AI output validation
│   │   ├── roomCode.js           # Generate / validate 4-letter codes
│   │   └── constants.js          # Game config (min/max players, rounds, etc.)
│   └── context/
│       └── PlayerContext.js      # React context for current player
```

---

## Database Tables (Supabase / Postgres)

### `rooms`
| Column        | Type        | Notes                                         |
|---------------|-------------|-----------------------------------------------|
| id            | uuid (PK)   | Default `gen_random_uuid()`                   |
| code          | text UNIQUE | 4-letter uppercase room code                  |
| host_id       | uuid (FK)   | References `players.id`                       |
| status        | text        | `waiting` → `playing` → `voting` → `finished` |
| scenario      | jsonb       | AI-generated scenario (setting, victim, etc.) |
| current_round | int         | Starts at 0                                   |
| max_rounds    | int         | Default 3                                     |
| created_at    | timestamptz | Default `now()`                               |

### `players`
| Column      | Type        | Notes                                      |
|-------------|-------------|--------------------------------------------|
| id          | uuid (PK)   | Default `gen_random_uuid()`                |
| room_id     | uuid (FK)   | References `rooms.id` ON DELETE CASCADE    |
| name        | text        | Player display name                        |
| role        | text        | `killer`, `detective`, `witness`, `suspect` (null until game starts) |
| secret_info | text        | Private info only this player sees         |
| is_host     | boolean     | Default `false`                            |
| is_alive    | boolean     | Default `true` (for future elimination)    |
| created_at  | timestamptz | Default `now()`                            |

### `clues`
| Column    | Type        | Notes                                    |
|-----------|-------------|------------------------------------------|
| id        | uuid (PK)   | Default `gen_random_uuid()`              |
| room_id   | uuid (FK)   | References `rooms.id` ON DELETE CASCADE  |
| round     | int         | Which round this clue belongs to         |
| content   | text        | AI-generated clue text                   |
| is_public | boolean     | `true` = everyone sees, `false` = targeted |
| target_player_id | uuid (FK) | Null if public; references `players.id` |
| created_at| timestamptz | Default `now()`                          |

### `accusations`
| Column      | Type        | Notes                                     |
|-------------|-------------|-------------------------------------------|
| id          | uuid (PK)   | Default `gen_random_uuid()`               |
| room_id     | uuid (FK)   | References `rooms.id` ON DELETE CASCADE   |
| accuser_id  | uuid (FK)   | References `players.id`                   |
| accused_id  | uuid (FK)   | References `players.id`                   |
| reason      | text        | Why they think this person did it         |
| ai_response | text        | AI narrator's reaction to the accusation  |
| round       | int         | Which round this happened in              |
| created_at  | timestamptz | Default `now()`                           |

### `votes`
| Column    | Type        | Notes                                      |
|-----------|-------------|--------------------------------------------|
| id        | uuid (PK)   | Default `gen_random_uuid()`                |
| room_id   | uuid (FK)   | References `rooms.id` ON DELETE CASCADE    |
| voter_id  | uuid (FK)   | References `players.id`                    |
| suspect_id| uuid (FK)   | Who they're voting as the killer           |
| created_at| timestamptz | Default `now()`                            |

### `messages`
| Column    | Type        | Notes                                      |
|-----------|-------------|--------------------------------------------|
| id        | uuid (PK)   | Default `gen_random_uuid()`                |
| room_id   | uuid (FK)   | References `rooms.id` ON DELETE CASCADE    |
| player_id | uuid (FK)   | Null if from AI narrator                   |
| sender    | text        | Player name or `"narrator"`                |
| content   | text        | Message text                               |
| round     | int         | Which round                                |
| type      | text        | `chat`, `narrator`, `system`, `accusation` |
| created_at| timestamptz | Default `now()`                            |

---

## Build Steps

---

### Step 1 — Project Scaffold & Global Styles

**Goal:** Initialize Next.js with App Router (JS only), install deps, set up global CSS with dark theme and CSS variables.

**Files to create/edit:**
- `package.json` (via `npx create-next-app`)
- `next.config.js`
- `jsconfig.json`
- `src/app/globals.css`
- `src/app/layout.js`
- `src/app/page.js` + `page.module.css`
- `.env.local` (placeholder keys)

**How to test:** Run `npm run dev`, open on phone or mobile emulator. See a styled landing page with the game title, a "Create Game" button, and a "Join Game" button. Dark theme, Google Font loaded.

**Done when:** Landing page renders with correct dark theme, buttons are visible, no console errors, mobile layout looks good.

---

### Step 2 — Supabase Setup & Database Tables

**Goal:** Create Supabase project, set up all 6 tables with correct columns, foreign keys, and RLS policies. Create Supabase client helpers.

**Files to create/edit:**
- `src/lib/supabase.js` (browser client)
- `src/lib/supabaseServer.js` (server client)
- `.env.local` (add real Supabase URL + anon key)
- SQL migrations (run in Supabase dashboard)

**How to test:** Open Supabase dashboard → confirm all 6 tables exist with correct columns. Import `supabase` client in the browser console or a test page and run a simple insert + select.

**Done when:** All tables exist, FK relationships work, RLS is enabled, both clients connect without errors.

---

### Step 3 — Room Creation API & Page

**Goal:** Build the "Create Game" flow. Host enters their name, hits create, gets a 4-letter room code, and is redirected to the lobby.

**Files to create/edit:**
- `src/lib/roomCode.js`
- `src/lib/constants.js`
- `src/app/api/rooms/route.js`
- `src/app/create/page.js` + `page.module.css`
- `src/context/PlayerContext.js`
- `src/hooks/usePlayer.js`

**How to test:** Go to `/create`, enter a name, click "Create". Should redirect to `/lobby/XXXX`. Check Supabase: a row in `rooms` and a row in `players` (with `is_host = true`).

**Done when:** Room + host player are created in DB, code is 4 uppercase letters, redirect works, player ID is saved in localStorage.

---

### Step 4 — Join Room API & Page

**Goal:** Build the "Join Game" flow. Player enters the 4-letter code and their name, joins the room, and is redirected to the lobby.

**Files to create/edit:**
- `src/app/api/join/route.js`
- `src/app/join/page.js` + `page.module.css`

**How to test:** Create a room first. Then open a second browser tab, go to `/join`, enter the code + a name. Should redirect to `/lobby/XXXX`. Check Supabase: new player row linked to the room.

**Done when:** Player can join an existing room by code, is added to `players` table, redirect to lobby works, player ID saved in localStorage.

---

### Step 5 — Lobby Page with Realtime Player List

**Goal:** Build the lobby where players wait. Show list of players updating in real time as people join. Host sees a "Start Game" button.

**Files to create/edit:**
- `src/app/lobby/[code]/page.js` + `page.module.css`
- `src/hooks/useSupabaseRoom.js`
- `src/components/PlayerCard.js` + `PlayerCard.module.css`

**How to test:** Open the lobby in two browser tabs with different players. When a new player joins, the list updates instantly in all tabs without refresh. Host sees "Start Game" button; non-hosts don't.

**Done when:** Lobby shows all players in real time, room code is displayed prominently, host has start button, mobile layout is clean.

---

### Step 6 — AI Narrator: Scenario Generation

**Goal:** When host clicks "Start Game", call the LLM to generate a murder mystery scenario, assign roles to players, and store everything in the DB.

**Files to create/edit:**
- `src/lib/ai.js` (LLM API wrapper)
- `src/lib/prompts.js` (scenario generation prompt)
- `src/lib/schemas.js` (Zod schema for scenario output)
- `src/app/api/game/start/route.js`
- `.env.local` (add LLM API key)

**How to test:** With 4+ players in lobby, host clicks "Start Game". Check Supabase: `rooms.scenario` has JSON, `rooms.status` = `playing`, each player has a `role` and `secret_info`. Print the scenario JSON to console to verify it makes sense.

**Done when:** AI generates a coherent scenario with a setting, victim, backstory, and assigns killer/detective/witness/suspect roles. Data is saved in DB. Zod validates the output.

---

### Step 7 — Game Screen Layout & Role Reveal

**Goal:** Build the main game page. When the game starts, players are redirected here. Each player sees their own secret role revealed with an animation.

**Files to create/edit:**
- `src/app/game/[code]/page.js` + `page.module.css`
- `src/hooks/useGameState.js`
- `src/components/NarratorBubble.js` + `NarratorBubble.module.css`

**How to test:** Start a game (from Step 6). Players should be redirected from lobby → `/game/XXXX`. Each player sees their role (e.g., "You are the Detective") with a Framer Motion reveal animation. The narrator introduces the scenario.

**Done when:** Game page loads, role is revealed privately per player, scenario intro is displayed, Framer Motion animation plays, mobile layout works.

---

### Step 8 — Round System & Clue Delivery

**Goal:** Build the round system. Host can advance to the next round. AI generates a new clue for each round. Clues appear for all players via Realtime.

**Files to create/edit:**
- `src/app/api/game/clue/route.js`
- `src/lib/prompts.js` (add clue generation prompt)
- `src/lib/schemas.js` (add clue schema)
- `src/components/ClueCard.js` + `ClueCard.module.css`
- Update `src/app/game/[code]/page.js`

**How to test:** During a game, host clicks "Next Round". A new clue appears for all players with animation. Check Supabase: `clues` table has new row, `rooms.current_round` incremented.

**Done when:** Rounds advance correctly, AI clues are coherent and build on the scenario, clues appear in real time for all players, round counter updates.

---

### Step 9 — Chat / Discussion System

**Goal:** Players can send messages to discuss during each round. Messages appear in real time for everyone. Narrator bubble is visually distinct.

**Files to create/edit:**
- Update `src/app/game/[code]/page.js` (add chat section)
- Update `src/app/game/[code]/page.module.css`
- `src/hooks/useGameState.js` (subscribe to messages)

**How to test:** Two players send messages. Both see each other's messages appear instantly. Messages show sender name and timestamp. Narrator messages look different from player messages.

**Done when:** Real-time chat works, messages are stored in `messages` table, UI distinguishes narrator vs player messages, scrolls to latest message, mobile-friendly.

---

### Step 10 — Accusation System

**Goal:** Any player can accuse another player of being the killer, with a reason. The AI narrator reacts to the accusation with a dramatic response.

**Files to create/edit:**
- `src/app/api/game/accuse/route.js`
- `src/lib/prompts.js` (add accusation reaction prompt)
- `src/lib/schemas.js` (add accusation response schema)
- Update `src/app/game/[code]/page.js` (accusation UI)

**How to test:** A player selects another player and types a reason. Click "Accuse". The accusation appears in the chat as a special message. The AI narrator responds dramatically. Check `accusations` table.

**Done when:** Accusation is saved, AI responds coherently, response appears in chat for all players, accusation messages are styled differently, works on mobile.

---

### Step 11 — Voting Page

**Goal:** After the final round, host triggers voting. All players are sent to the vote page where they pick who they think is the killer.

**Files to create/edit:**
- `src/app/api/vote/route.js`
- `src/app/vote/[code]/page.js` + `page.module.css`
- `src/components/VotePanel.js` + `VotePanel.module.css`

**How to test:** After the last round, host clicks "Go to Vote". All players are redirected to `/vote/XXXX`. Each player selects a suspect and submits. Check `votes` table. Players can't vote twice.

**Done when:** All players can vote, votes are saved, duplicate votes are prevented, UI shows who you voted for after submission, real-time count of "X of Y players have voted" is visible.

---

### Step 12 — Reveal Page & Dramatic Finale

**Goal:** After all votes are in, show the dramatic reveal. AI narrator announces the killer, whether the group guessed correctly, and gives a dramatic closing monologue.

**Files to create/edit:**
- `src/app/api/reveal/route.js`
- `src/lib/prompts.js` (add reveal/closing prompt)
- `src/lib/schemas.js` (add reveal schema)
- `src/app/reveal/[code]/page.js` + `page.module.css`
- `src/components/RevealScene.js` + `RevealScene.module.css`

**How to test:** After all votes, players go to `/reveal/XXXX`. The killer is revealed with Framer Motion animation. AI narrator gives closing monologue. Vote breakdown is shown.

**Done when:** Reveal plays out dramatically, correct/incorrect verdict is shown, vote breakdown visible, AI closing monologue is coherent, animations are smooth.

---

### Step 13 — Timer Component

**Goal:** Add optional timers to rounds and voting to keep the game moving. Host can configure timer length.

**Files to create/edit:**
- `src/components/Timer.js` + `Timer.module.css`
- Update `src/app/game/[code]/page.js`
- Update `src/app/vote/[code]/page.js`
- Update `src/lib/constants.js` (timer defaults)

**How to test:** Start a game. Each round has a visible countdown timer. When it expires, a "time's up" message appears. Host can set timer duration in lobby.

**Done when:** Timer counts down visually, synced for all players, auto-advances or shows warning when time is up, looks good on mobile.

---

### Step 14 — Navbar & Navigation Polish

**Goal:** Add a top navbar with room code, round info, and game status. Polish all page transitions and navigation guards (can't go to game page if not in a room, etc.).

**Files to create/edit:**
- `src/components/Navbar.js` + `Navbar.module.css`
- Update `src/app/layout.js`
- Add redirect logic to protected pages

**How to test:** Navigate through the entire flow: home → create → lobby → game → vote → reveal. Navbar shows correct info at each stage. Try accessing `/game/XXXX` without being in the room — should redirect to home.

**Done when:** Navbar works on all pages, navigation guards prevent invalid access, smooth page transitions, no dead ends.

---

### Step 15 — Error Handling, Edge Cases & Polish

**Goal:** Handle all error states: room not found, room full, game already started, LLM failure, network issues. Add loading states, toasts, and error messages.

**Files to create/edit:**
- Add error UI to all pages
- Add loading skeletons/spinners
- Update API routes with proper error responses
- Add try/catch everywhere

**How to test:** Try to join a non-existent room code. Try to join a room that's already playing. Disconnect internet and reconnect. Verify all error states show friendly messages.

**Done when:** No unhandled errors, friendly error messages everywhere, loading states on all async actions, app recovers gracefully from disconnects.

---

### Step 16 — Deploy to Vercel

**Goal:** Deploy the app to Vercel. Set all environment variables. Test the full game flow on real phones with friends.

**Files to create/edit:**
- `vercel.json` (if needed)
- Verify `.env.local` vars are set in Vercel dashboard

**How to test:** Deploy to Vercel. Open the URL on two real phones. Play through an entire game: create → join → lobby → start → rounds → clues → accusations → vote → reveal.

**Done when:** App is live on Vercel, full game works on real devices, no CORS or env var issues, Supabase Realtime works in production.

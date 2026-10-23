-- ═══════════════════════════════════════════════════════════════
-- DEADLINE // AI Murder Mystery — Complete Database Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ═══════════════════════════════════════════════════════════════

-- 1. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'voting' | 'finished'
  scenario JSONB,
  current_round INT NOT NULL DEFAULT 0,
  max_rounds INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT, -- 'killer' | 'detective' | 'witness' | 'suspect'
  secret_info TEXT,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add host foreign key after players table is created
ALTER TABLE rooms 
  DROP CONSTRAINT IF EXISTS fk_rooms_host;
ALTER TABLE rooms 
  ADD CONSTRAINT fk_rooms_host 
  FOREIGN KEY (host_id) REFERENCES players(id) ON DELETE SET NULL;

-- 3. CLUES TABLE
CREATE TABLE IF NOT EXISTS clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  target_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ACCUSATIONS TABLE
CREATE TABLE IF NOT EXISTS accusations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  accuser_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  accused_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ai_response TEXT,
  round INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. VOTES TABLE
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  suspect_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_voter UNIQUE (room_id, voter_id)
);

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  round INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'chat', -- 'chat' | 'narrator' | 'system' | 'accusation'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Enable Row Level Security (RLS) ──
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE accusations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies (Allow access for party players) ──
DROP POLICY IF EXISTS "Public select rooms" ON rooms;
CREATE POLICY "Public select rooms" ON rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert rooms" ON rooms;
CREATE POLICY "Public insert rooms" ON rooms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update rooms" ON rooms;
CREATE POLICY "Public update rooms" ON rooms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select players" ON players;
CREATE POLICY "Public select players" ON players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert players" ON players;
CREATE POLICY "Public insert players" ON players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update players" ON players;
CREATE POLICY "Public update players" ON players FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public delete players" ON players;
CREATE POLICY "Public delete players" ON players FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public select clues" ON clues;
CREATE POLICY "Public select clues" ON clues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert clues" ON clues;
CREATE POLICY "Public insert clues" ON clues FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select accusations" ON accusations;
CREATE POLICY "Public select accusations" ON accusations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert accusations" ON accusations;
CREATE POLICY "Public insert accusations" ON accusations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select votes" ON votes;
CREATE POLICY "Public select votes" ON votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert votes" ON votes;
CREATE POLICY "Public insert votes" ON votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select messages" ON messages;
CREATE POLICY "Public select messages" ON messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert messages" ON messages;
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);

-- ── Enable Realtime for all tables ──
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms, players, clues, accusations, votes, messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

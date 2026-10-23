import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { GAME_STATUS } from '@/lib/constants';

const BOT_NAMES = ['Sam (Bot)', 'Chloe (Bot)', 'Marcus (Bot)', 'Elena (Bot)', 'David (Bot)'];

export async function POST(req) {
  try {
    const hostHeader = req.headers.get('host') || '';
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const isDev = process.env.NODE_ENV !== 'production' || isLocal;

    if (!isDev && !process.env.ALLOW_TEST_BOTS) {
      return NextResponse.json(
        { error: 'Test bots are only available on the development/test server.' },
        { status: 403 }
      );
    }

    const { roomId, roomCode, targetCount = 4 } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    // 1. Verify room exists and is in waiting state
    const { data: room, error: roomErr } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== GAME_STATUS.WAITING) {
      return NextResponse.json(
        { error: 'Game has already started. Cannot add test bots now.' },
        { status: 400 }
      );
    }

    // 2. Fetch existing players
    const { data: existingPlayers, error: playersErr } = await supabaseServer
      .from('players')
      .select('id, name')
      .eq('room_id', roomId);

    if (playersErr) {
      return NextResponse.json({ error: 'Failed to load players' }, { status: 500 });
    }

    const currentCount = existingPlayers?.length || 0;
    const needed = Math.max(0, targetCount - currentCount);

    if (needed === 0) {
      return NextResponse.json({
        success: true,
        message: 'Room already has sufficient players.',
        players: existingPlayers,
      });
    }

    const existingNames = new Set((existingPlayers || []).map((p) => p.name.toLowerCase()));
    const availableBotNames = BOT_NAMES.filter((name) => !existingNames.has(name.toLowerCase()));

    const botsToInsert = availableBotNames.slice(0, needed).map((name) => ({
      room_id: roomId,
      name,
      is_host: false,
      is_alive: true,
    }));

    if (botsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No additional bot names available.' },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertErr } = await supabaseServer
      .from('players')
      .insert(botsToInsert)
      .select();

    if (insertErr) {
      console.error('Error inserting test bots:', insertErr);
      return NextResponse.json({ error: 'Failed to insert test bots.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      added: inserted,
      totalCount: currentCount + inserted.length,
    });
  } catch (err) {
    console.error('Error in /api/rooms/test-bots:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error adding test bots.' },
      { status: 500 }
    );
  }
}

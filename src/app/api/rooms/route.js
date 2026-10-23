import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateRoomCode } from '@/lib/roomCode';
import { GAME_STATUS, DEFAULT_MAX_ROUNDS } from '@/lib/constants';

// POST: Create a new room with host
export async function POST(request) {
  try {
    const body = await request.json();
    const hostName = (body.hostName || '').trim();

    if (!hostName || hostName.length < 2 || hostName.length > 20) {
      return NextResponse.json(
        { error: 'Host name must be between 2 and 20 characters.' },
        { status: 400 }
      );
    }

    // Generate unique 4-letter room code
    let roomCode = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabaseServer
        .from('rooms')
        .select('id')
        .eq('code', roomCode)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        roomCode = generateRoomCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate a unique room code. Please try again.' },
        { status: 500 }
      );
    }

    // 1. Create the room
    const { data: room, error: roomError } = await supabaseServer
      .from('rooms')
      .insert({
        code: roomCode,
        status: GAME_STATUS.WAITING,
        current_round: 0,
        max_rounds: DEFAULT_MAX_ROUNDS,
      })
      .select()
      .single();

    if (roomError || !room) {
      console.error('Room creation error:', roomError);
      return NextResponse.json(
        { error: roomError?.message || 'Failed to create room.' },
        { status: 500 }
      );
    }

    // 2. Add the host player
    const { data: player, error: playerError } = await supabaseServer
      .from('players')
      .insert({
        room_id: room.id,
        name: hostName,
        is_host: true,
        is_alive: true,
      })
      .select()
      .single();

    if (playerError || !player) {
      console.error('Host player creation error:', playerError);
      // Clean up orphaned room
      await supabaseServer.from('rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: playerError?.message || 'Failed to create host player.' },
        { status: 500 }
      );
    }

    // 3. Link host_id back to room
    await supabaseServer
      .from('rooms')
      .update({ host_id: player.id })
      .eq('id', room.id);

    return NextResponse.json({
      success: true,
      room: { ...room, host_id: player.id },
      player,
    });
  } catch (err) {
    console.error('Create room server error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Query room info by ?code=XXXX
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('code') || '').trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const { data: room, error } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

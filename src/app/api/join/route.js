import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { isValidRoomCode } from '@/lib/roomCode';
import { GAME_STATUS, MAX_PLAYERS } from '@/lib/constants';

// POST: Join an existing room
export async function POST(request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const playerName = (body.playerName || '').trim();

    // 1. Validate inputs
    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: 'Room code must be exactly 4 letters.' },
        { status: 400 }
      );
    }

    if (!playerName || playerName.length < 2 || playerName.length > 20) {
      return NextResponse.json(
        { error: 'Player name must be between 2 and 20 characters.' },
        { status: 400 }
      );
    }

    // 2. Look up the room
    const { data: room, error: roomError } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (roomError) {
      console.error('Error fetching room:', roomError);
      return NextResponse.json(
        { error: 'Failed to look up room. Please try again.' },
        { status: 500 }
      );
    }

    if (!room) {
      return NextResponse.json(
        { error: `Room "${code}" not found. Check the code and try again.` },
        { status: 404 }
      );
    }

    // 3. Check game status
    if (room.status !== GAME_STATUS.WAITING) {
      return NextResponse.json(
        { error: 'Game has already started or ended. You cannot join now.' },
        { status: 400 }
      );
    }

    // 4. Fetch current players in the room
    const { data: existingPlayers, error: playersError } = await supabaseServer
      .from('players')
      .select('id, name')
      .eq('room_id', room.id);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json(
        { error: 'Failed to verify room capacity.' },
        { status: 500 }
      );
    }

    if (existingPlayers && existingPlayers.length >= MAX_PLAYERS) {
      return NextResponse.json(
        { error: `Room is full (maximum ${MAX_PLAYERS} players).` },
        { status: 400 }
      );
    }

    // Check duplicate name
    const nameTaken = existingPlayers?.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameTaken) {
      return NextResponse.json(
        { error: `The name "${playerName}" is already taken in this room. Choose another.` },
        { status: 400 }
      );
    }

    // 5. Insert new player
    const { data: player, error: insertError } = await supabaseServer
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName,
        is_host: false,
        is_alive: true,
      })
      .select()
      .single();

    if (insertError || !player) {
      console.error('Player join error:', insertError);
      return NextResponse.json(
        { error: insertError?.message || 'Failed to join room.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
      player,
    });
  } catch (err) {
    console.error('Join API route error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

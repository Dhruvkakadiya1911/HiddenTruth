import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateMysteryScenario } from '@/lib/ai';
import { GAME_STATUS, MIN_PLAYERS } from '@/lib/constants';

// POST: Start game and generate AI scenario
export async function POST(request) {
  try {
    const body = await request.json();
    const { roomId, roomCode } = body;

    if (!roomId && !roomCode) {
      return NextResponse.json(
        { error: 'Room ID or code is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch room
    let query = supabaseServer.from('rooms').select('*');
    if (roomId) {
      query = query.eq('id', roomId);
    } else {
      query = query.eq('code', roomCode.toUpperCase());
    }

    const { data: room, error: roomError } = await query.single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    if (room.status !== GAME_STATUS.WAITING) {
      return NextResponse.json(
        { error: 'Game has already started.' },
        { status: 400 }
      );
    }

    // 2. Fetch all joined players in deterministic order
    const { data: players, error: playersError } = await supabaseServer
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });

    if (playersError || !players || players.length < MIN_PLAYERS) {
      return NextResponse.json(
        {
          error: `Need at least ${MIN_PLAYERS} players to begin investigation. Current: ${players?.length || 0}.`,
        },
        { status: 400 }
      );
    }

    // 3. Generate AI Scenario & strictly guaranteed secret roles
    const scenario = await generateMysteryScenario(players);

    // 4. Update each player with their secret role and info
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      let assigned =
        scenario.playerRoles.find((r) => r.playerId && r.playerId === p.id) ||
        scenario.playerRoles.find(
          (r) => r.playerName && r.playerName.trim().toLowerCase() === p.name.trim().toLowerCase()
        ) ||
        scenario.playerRoles[i];

      const targetRole = assigned?.role || 'suspect';
      const targetSecret = assigned?.secretInfo || 'You were present when the crime took place. Defend your innocence.';

      const { error: updatePlayerErr } = await supabaseServer
        .from('players')
        .update({
          role: targetRole,
          secret_info: targetSecret,
        })
        .eq('id', p.id);

      if (updatePlayerErr) {
        console.error(`Failed to assign role to player ${p.id} (${p.name}):`, updatePlayerErr);
      }
    }

    // 5. Insert narrator intro message
    await supabaseServer.from('messages').insert({
      room_id: room.id,
      player_id: null,
      sender: 'narrator',
      content: scenario.intro,
      round: 1,
      type: 'narrator',
    });

    // 6. Insert first crime scene clue
    await supabaseServer.from('clues').insert({
      room_id: room.id,
      round: 1,
      content: `The mystery begins: ${scenario.victim} has been eliminated. The weapon found nearby was the ${scenario.weapon}. Who was near the scene?`,
      is_public: true,
    });

    // 7. Update room status to playing & current_round to 1
    const nowIso = new Date().toISOString();
    const scenarioWithTimestamp = {
      ...scenario,
      round_1_started_at: nowIso,
      current_round_started_at: nowIso,
    };

    const { data: updatedRoom, error: updateError } = await supabaseServer
      .from('rooms')
      .update({
        status: GAME_STATUS.PLAYING,
        current_round: 1,
        scenario: scenarioWithTimestamp,
      })
      .eq('id', room.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update room to playing status:', updateError);
      return NextResponse.json(
        { error: 'Failed to launch game.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      scenario,
    });
  } catch (err) {
    console.error('Error in /api/game/start:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

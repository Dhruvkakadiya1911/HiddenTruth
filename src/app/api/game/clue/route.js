import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateRoundClue } from '@/lib/ai';
import { GAME_STATUS } from '@/lib/constants';

// POST: Advance round and generate AI clue
export async function POST(request) {
  try {
    const body = await request.json();
    const { roomId, roomCode } = body;

    if (!roomId && !roomCode) {
      return NextResponse.json({ error: 'Room ID or code is required.' }, { status: 400 });
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

    if (room.status !== GAME_STATUS.PLAYING) {
      return NextResponse.json({ error: 'Game is not currently active.' }, { status: 400 });
    }

    const currentRound = room.current_round || 1;
    const maxRounds = room.max_rounds || 3;
    const nextRound = currentRound + 1;

    // Concurrency Check 1: If client sent currentRound and it's already higher,
    // another request already advanced this room. Do not run duplicate logic.
    if (body.currentRound !== undefined && Number(body.currentRound) !== currentRound) {
      return NextResponse.json({
        success: true,
        alreadyAdvanced: true,
        round: currentRound,
        room,
      });
    }

    // Check if max rounds reached -> transition to voting
    if (nextRound > maxRounds) {
      const nowIso = new Date().toISOString();
      const updatedScenario = {
        ...(room.scenario || {}),
        voting_started_at: nowIso,
      };

      await supabaseServer
        .from('rooms')
        .update({
          status: GAME_STATUS.VOTING,
          scenario: updatedScenario,
        })
        .eq('id', room.id);

      await supabaseServer.from('messages').insert({
        room_id: room.id,
        sender: 'narrator',
        content: 'All evidence has been laid bare. Suspects, the hour of truth has arrived. Cast your vote and name the killer!',
        round: maxRounds,
        type: 'narrator',
      });

      return NextResponse.json({
        success: true,
        finished: true,
        status: GAME_STATUS.VOTING,
      });
    }

    // Concurrency Check 2: Check if a clue for nextRound has ALREADY been inserted
    const { data: existingClueForRound } = await supabaseServer
      .from('clues')
      .select('*')
      .eq('room_id', room.id)
      .eq('round', nextRound);

    if (existingClueForRound && existingClueForRound.length > 0) {
      // Clue already exists! Sync room round and return existing without generating duplicate
      let updatedRoom = room;
      if (room.current_round < nextRound) {
        const nowIso = new Date().toISOString();
        const updatedScenario = {
          ...(room.scenario || {}),
          [`round_${nextRound}_started_at`]: existingClueForRound[0].created_at || nowIso,
          current_round_started_at: existingClueForRound[0].created_at || nowIso,
        };
        const { data: synced } = await supabaseServer
          .from('rooms')
          .update({
            current_round: nextRound,
            scenario: updatedScenario,
          })
          .eq('id', room.id)
          .select()
          .single();
        if (synced) updatedRoom = synced;
      }

      return NextResponse.json({
        success: true,
        alreadyAdvanced: true,
        round: nextRound,
        clue: existingClueForRound[0],
        room: updatedRoom,
      });
    }

    // 2. Fetch existing clues
    const { data: existingClues } = await supabaseServer
      .from('clues')
      .select('content')
      .eq('room_id', room.id);

    // 3. Generate new AI clue
    const clue = await generateRoundClue(room.scenario || {}, nextRound, existingClues || []);

    // 4. Insert clue into database
    const { data: newClue, error: clueError } = await supabaseServer
      .from('clues')
      .insert({
        room_id: room.id,
        round: nextRound,
        content: `[ROUND ${nextRound}] ${clue.title.toUpperCase()}: ${clue.content}`,
        is_public: true,
      })
      .select()
      .single();

    if (clueError) {
      console.error('Failed to insert clue:', clueError);
      return NextResponse.json({ error: 'Failed to record clue.' }, { status: 500 });
    }

    // 5. Insert narrator reaction
    if (clue.narratorComment) {
      await supabaseServer.from('messages').insert({
        room_id: room.id,
        sender: 'narrator',
        content: clue.narratorComment,
        round: nextRound,
        type: 'narrator',
      });
    }

    // 6. Update room current_round and timestamp
    const nowIso = new Date().toISOString();
    const updatedScenario = {
      ...(room.scenario || {}),
      [`round_${nextRound}_started_at`]: nowIso,
      current_round_started_at: nowIso,
    };

    const { data: updatedRoom } = await supabaseServer
      .from('rooms')
      .update({
        current_round: nextRound,
        scenario: updatedScenario,
      })
      .eq('id', room.id)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      round: nextRound,
      clue: newClue,
      room: updatedRoom,
    });
  } catch (err) {
    console.error('Error in /api/game/clue:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

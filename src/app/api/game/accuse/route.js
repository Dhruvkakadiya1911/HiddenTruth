import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateAccusationReaction } from '@/lib/ai';

export async function POST(req) {
  try {
    const { roomId, accuserId, accusedId, reason, round } = await req.json();

    if (!roomId || !accuserId || !accusedId || !reason?.trim()) {
      return NextResponse.json(
        { error: 'Missing required accusation details.' },
        { status: 400 }
      );
    }

    if (accuserId === accusedId) {
      return NextResponse.json(
        { error: 'You cannot accuse yourself!' },
        { status: 400 }
      );
    }

    // 1. Fetch room details
    const { data: room, error: roomErr } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    // 2. Fetch accuser and accused players
    const { data: players, error: playersErr } = await supabaseServer
      .from('players')
      .select('*')
      .in('id', [accuserId, accusedId]);

    if (playersErr || !players || players.length < 2) {
      return NextResponse.json({ error: 'Players not found.' }, { status: 404 });
    }

    const accuser = players.find((p) => p.id === accuserId);
    const accused = players.find((p) => p.id === accusedId);

    // 3. Generate AI narrator dramatic reaction
    const currentRound = round || room.current_round || 1;
    const aiResult = await generateAccusationReaction(
      room.scenario || {},
      accuser.name,
      accused.name,
      reason.trim(),
      currentRound
    );

    const narratorReaction = aiResult?.narratorReaction || 
      `All eyes swing to ${accused.name} as ${accuser.name} makes their damning charge!`;

    // 4. Save to accusations table
    const { data: accusationData, error: accuseErr } = await supabaseServer
      .from('accusations')
      .insert({
        room_id: roomId,
        accuser_id: accuserId,
        accused_id: accusedId,
        reason: reason.trim(),
        ai_response: narratorReaction,
        round: currentRound,
      })
      .select()
      .single();

    if (accuseErr) {
      console.error('Error recording accusation:', accuseErr);
    }

    // 5. Post accusation & narrator messages into the live interrogation thread
    const newMessages = [
      {
        room_id: roomId,
        player_id: accuserId,
        sender: accuser.name,
        content: `🚨 FORMAL ACCUSATION against ${accused.name}: "${reason.trim()}"`,
        round: currentRound,
        type: 'accusation',
      },
      {
        room_id: roomId,
        player_id: null,
        sender: 'narrator',
        content: narratorReaction,
        round: currentRound,
        type: 'narrator',
      },
    ];

    const { error: msgErr } = await supabaseServer
      .from('messages')
      .insert(newMessages);

    if (msgErr) {
      console.error('Error inserting accusation messages:', msgErr);
    }

    return NextResponse.json({
      success: true,
      accusation: accusationData,
      reaction: narratorReaction,
    });
  } catch (err) {
    console.error('Error in /api/game/accuse:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing accusation.' },
      { status: 500 }
    );
  }
}

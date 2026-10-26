import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req) {
  try {
    const { roomId, playerId, sender, targetId, reaction } = await req.json();

    if (!roomId || !targetId || !reaction) {
      return NextResponse.json({ error: 'Missing required reaction fields.' }, { status: 400 });
    }

    if (!['sus', 'lie', 'trust'].includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction type.' }, { status: 400 });
    }

    // Insert lightweight reaction message
    const { data, error } = await supabaseServer.from('messages').insert({
      room_id: roomId,
      player_id: playerId || null,
      sender: sender || 'Player',
      content: JSON.stringify({ targetId, reaction }),
      round: 1,
      type: 'reaction',
    }).select().single();

    if (error) {
      console.error('Reaction error:', error);
      return NextResponse.json({ error: 'Failed to record reaction.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reaction: data });
  } catch (err) {
    console.error('Error in /api/game/react:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// POST: Send chat message in game
export async function POST(request) {
  try {
    const body = await request.json();
    const { roomId, playerId, sender, content, round, type = 'chat' } = body;

    const cleanContent = (content || '').trim();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });
    }

    if (!cleanContent) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    if (cleanContent.length > 300) {
      return NextResponse.json({ error: 'Message exceeds 300 characters.' }, { status: 400 });
    }

    // Anonymize witness tips
    const isAnonymous = type === 'anonymous';
    const finalSender = isAnonymous ? '🕶️ Anonymous Tip' : (sender || 'Unknown');
    const finalPlayerId = isAnonymous ? null : (playerId || null);

    const { data: message, error } = await supabaseServer
      .from('messages')
      .insert({
        room_id: roomId,
        player_id: finalPlayerId,
        sender: finalSender,
        content: cleanContent,
        round: round || 1,
        type: type || 'chat',
      })
      .select()
      .single();

    if (error || !message) {
      console.error('Chat insert error:', error);
      return NextResponse.json({ error: error?.message || 'Failed to send message.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

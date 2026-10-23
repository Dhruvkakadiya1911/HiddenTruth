import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/vote?roomId=xxx
export async function GET(req) {

  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const roomCode = searchParams.get('roomCode');

    let targetRoomId = roomId;

    if (!targetRoomId && roomCode) {
      const { data: room } = await supabaseServer
        .from('rooms')
        .select('id')
        .eq('code', roomCode.toUpperCase())
        .maybeSingle();

      if (room) targetRoomId = room.id;
    }

    if (!targetRoomId) {
      return NextResponse.json({ error: 'Missing roomId or roomCode.' }, { status: 400 });
    }

    // Fetch players and votes
    const [playersRes, votesRes] = await Promise.all([
      supabaseServer.from('players').select('id, name, is_host').eq('room_id', targetRoomId),
      supabaseServer.from('votes').select('*').eq('room_id', targetRoomId),
    ]);

    const totalPlayers = playersRes.data?.length || 0;
    const votes = votesRes.data || [];
    const totalVotes = votes.length;

    return NextResponse.json({
      success: true,
      votes,
      totalVotes,
      totalPlayers,
      allVoted: totalPlayers > 0 && totalVotes >= totalPlayers,
    });
  } catch (err) {
    console.error('Error in GET /api/vote:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/vote
export async function POST(req) {
  try {
    const { roomId, voterId, suspectId } = await req.json();

    if (!roomId || !voterId || !suspectId) {
      return NextResponse.json(
        { error: 'Missing required voting parameters (roomId, voterId, suspectId).' },
        { status: 400 }
      );
    }

    // A player cannot vote for / accuse themselves
    if (voterId === suspectId) {
      return NextResponse.json(
        { error: 'You cannot vote for yourself! You must accuse another suspect.' },
        { status: 400 }
      );
    }

    // 1. Verify player hasn't already voted
    const { data: existingVote } = await supabaseServer
      .from('votes')
      .select('id, suspect_id')
      .eq('room_id', roomId)
      .eq('voter_id', voterId)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already cast your verdict.', vote: existingVote },
        { status: 409 }
      );
    }

    // 2. Cast vote
    const { data: newVote, error: insertErr } = await supabaseServer
      .from('votes')
      .insert({
        room_id: roomId,
        voter_id: voterId,
        suspect_id: suspectId,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'You have already cast your verdict.' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    // 2.5 Auto-cast votes for mock test bots (if present) so solo testing completes smoothly
    try {
      const { data: allRoomPlayers } = await supabaseServer
        .from('players')
        .select('id, name')
        .eq('room_id', roomId);

      const { data: currentRoomVotes } = await supabaseServer
        .from('votes')
        .select('voter_id')
        .eq('room_id', roomId);

      const votedIds = new Set((currentRoomVotes || []).map((v) => v.voter_id));
      const unvotedBots = (allRoomPlayers || []).filter(
        (p) => (p.name.includes('(Bot)') || p.name.includes('(Test)')) && !votedIds.has(p.id)
      );

      if (unvotedBots.length > 0 && allRoomPlayers && allRoomPlayers.length > 1) {
        const botVotes = unvotedBots.map((bot) => {
          const potentialTargets = allRoomPlayers.filter((p) => p.id !== bot.id);
          const randomTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
          return {
            room_id: roomId,
            voter_id: bot.id,
            suspect_id: randomTarget.id,
          };
        });

        await supabaseServer.from('votes').insert(botVotes);
      }
    } catch (botVoteErr) {
      console.warn('Bot vote auto-cast notice:', botVoteErr);
    }

    // 3. Count total votes & players
    const [playersRes, allVotesRes] = await Promise.all([
      supabaseServer.from('players').select('id').eq('room_id', roomId),
      supabaseServer.from('votes').select('id').eq('room_id', roomId),
    ]);

    const totalPlayers = playersRes.data?.length || 0;
    const totalVotes = allVotesRes.data?.length || 0;
    const allVoted = totalPlayers > 0 && totalVotes >= totalPlayers;

    return NextResponse.json({
      success: true,
      vote: newVote,
      totalVotes,
      totalPlayers,
      allVoted,
    });
  } catch (err) {
    console.error('Error in POST /api/vote:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit vote.' },
      { status: 500 }
    );
  }
}

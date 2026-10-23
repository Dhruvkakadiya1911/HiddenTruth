import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateRevealMonologue } from '@/lib/ai';
import { GAME_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req) {

  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get('roomCode');
    const roomId = searchParams.get('roomId');

    let targetRoomId = roomId;

    if (!targetRoomId && roomCode) {
      const { data: roomData, error: roomErr } = await supabaseServer
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomErr || !roomData) {
        return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
      }
      targetRoomId = roomData.id;
    }

    if (!targetRoomId) {
      return NextResponse.json({ error: 'Missing roomCode or roomId.' }, { status: 400 });
    }

    // 1. Fetch room
    const { data: room, error: roomFetchErr } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('id', targetRoomId)
      .single();

    if (roomFetchErr || !room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    // Ensure status is marked finished
    if (room.status !== GAME_STATUS.FINISHED) {
      await supabaseServer
        .from('rooms')
        .update({ status: GAME_STATUS.FINISHED })
        .eq('id', room.id);
    }

    // 2. Fetch all players
    const { data: players, error: playersErr } = await supabaseServer
      .from('players')
      .select('id, name, role, secret_info, is_host')
      .eq('room_id', targetRoomId);

    if (playersErr || !players) {
      return NextResponse.json({ error: 'Failed to fetch players.' }, { status: 500 });
    }

    // 3. Fetch all votes
    const { data: votes, error: votesErr } = await supabaseServer
      .from('votes')
      .select('id, voter_id, suspect_id')
      .eq('room_id', targetRoomId);

    if (votesErr) {
      console.error('Error fetching votes:', votesErr);
    }

    const votesList = votes || [];
    const scenario = room.scenario || {};

    // 4. Find the actual killer
    let killerPlayer = players.find((p) => (p.role || '').toLowerCase().includes('kill'));
    if (!killerPlayer && scenario.killerName) {
      killerPlayer = players.find(
        (p) => p.name.trim().toLowerCase() === scenario.killerName.trim().toLowerCase()
      );
    }

    const killerName = killerPlayer ? killerPlayer.name : scenario.killerName || 'The Killer';

    // 5. Calculate vote breakdown
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const tallyMap = new Map();

    players.forEach((p) => {
      tallyMap.set(p.id, {
        suspectId: p.id,
        suspectName: p.name,
        role: p.role,
        count: 0,
        voters: [],
      });
    });

    votesList.forEach((v) => {
      const tally = tallyMap.get(v.suspect_id);
      const voter = playerMap.get(v.voter_id);
      if (tally) {
        tally.count += 1;
        if (voter) tally.voters.push(voter.name);
      }
    });

    const voteBreakdown = Array.from(tallyMap.values()).sort((a, b) => b.count - a.count);

    // Most voted suspect
    const mostVoted = voteBreakdown.length > 0 && voteBreakdown[0].count > 0 ? voteBreakdown[0] : null;

    // Did the group guess correctly?
    const groupWon = Boolean(
      mostVoted && killerPlayer && mostVoted.suspectId === killerPlayer.id
    );

    // 6. Generate AI narrator monologue
    const aiResult = await generateRevealMonologue(
      scenario,
      killerName,
      mostVoted?.suspectName,
      groupWon
    );

    return NextResponse.json({
      success: true,
      room,
      scenario,
      killer: killerPlayer || { name: killerName, role: 'killer' },
      killerName,
      groupWon,
      mostVoted,
      totalVotes: votesList.length,
      totalPlayers: players.length,
      voteBreakdown,
      players,
      narratorMonologue: aiResult.narratorMonologue,
      verdictSummary: aiResult.verdictSummary,
    });
  } catch (err) {
    console.error('Error in /api/reveal:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process grand finale reveal.' },
      { status: 500 }
    );
  }
}

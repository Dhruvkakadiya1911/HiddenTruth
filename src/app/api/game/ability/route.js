import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateDetectiveScan } from '@/lib/ai';

export async function POST(req) {
  try {
    const body = await req.json();
    const { roomId, playerId, targetSuspectId, abilityType, reason, round = 1 } = body;

    if (!roomId || !playerId || !targetSuspectId) {
      return NextResponse.json(
        { error: 'Missing required parameters for special ability.' },
        { status: 400 }
      );
    }

    // 1. Fetch room & scenario
    const { data: room, error: roomErr } = await supabaseServer
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    // 2. Fetch actor & target players
    const { data: players, error: playersErr } = await supabaseServer
      .from('players')
      .select('*')
      .in('id', [playerId, targetSuspectId]);

    if (playersErr || !players || players.length < 2) {
      return NextResponse.json({ error: 'Player or target not found.' }, { status: 404 });
    }

    const actor = players.find((p) => p.id === playerId);
    const target = players.find((p) => p.id === targetSuspectId);

    // ─── ACTION: DETECTIVE FORENSIC SCAN ───
    if (abilityType === 'detective_scan') {
      const isDetective = (actor.role || '').toLowerCase().includes('detec');
      if (!isDetective) {
        return NextResponse.json(
          { error: 'Only the Detective can conduct a forensic scan!' },
          { status: 403 }
        );
      }

      const isTargetKiller = (target.role || '').toLowerCase().includes('kill');
      const scanResult = await generateDetectiveScan(
        room.scenario || {},
        target.name,
        target.role,
        isTargetKiller
      );

      // Post public notification to the room (does not reveal scan contents)
      await supabaseServer.from('messages').insert({
        room_id: roomId,
        player_id: actor.id,
        sender: actor.name,
        content: `🔬 Detective ${actor.name} conducted a confidential forensic scan on ${target.name}!`,
        round: round || room.current_round || 1,
        type: 'system',
      });

      return NextResponse.json({
        success: true,
        scanResult: {
          targetName: target.name,
          ...scanResult,
        },
      });
    }

    // ─── ACTION: HOT SEAT CHALLENGE ───
    if (abilityType === 'hotseat') {
      const cleanReason = (reason || 'Explain your whereabouts and timeline!').trim();

      // Post Hot Seat announcement
      await supabaseServer.from('messages').insert([
        {
          room_id: roomId,
          player_id: actor.id,
          sender: actor.name,
          content: `🔥 HOT SEAT CHALLENGE against ${target.name}: "${cleanReason}"`,
          round: round || room.current_round || 1,
          type: 'hotseat',
        },
        {
          room_id: roomId,
          player_id: null,
          sender: 'narrator',
          content: `🎙️ AI Narrator: "${target.name} has been forced onto the HOT SEAT by ${actor.name}! The clock is ticking — plead your defense!"`,
          round: round || room.current_round || 1,
          type: 'narrator',
        },
      ]);

      return NextResponse.json({
        success: true,
        targetId: target.id,
        targetName: target.name,
      });
    }

    return NextResponse.json({ error: 'Unknown ability type.' }, { status: 400 });
  } catch (err) {
    console.error('Error in /api/game/ability:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing special ability.' },
      { status: 500 }
    );
  }
}

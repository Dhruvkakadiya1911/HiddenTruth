'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useGameState(roomCode, playerId) {
  const [room, setRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [clues, setClues] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFullState = useCallback(async () => {
    if (!roomCode) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomErr) throw roomErr;
      if (!roomData) throw new Error(`Room "${roomCode}" not found.`);
      setRoom(roomData);

      // 2. Fetch all players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      // 3. Find current player
      if (playerId && playersData) {
        const found = playersData.find((p) => p.id === playerId);
        if (found) setCurrentPlayer(found);
      }

      // 4. Fetch clues
      const { data: cluesData, error: cluesErr } = await supabase
        .from('clues')
        .select('*')
        .eq('room_id', roomData.id)
        .order('round', { ascending: true });

      if (cluesErr) throw cluesErr;
      setClues(cluesData || []);

      // 5. Fetch messages
      const { data: msgsData, error: msgsErr } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true });

      if (msgsErr) throw msgsErr;
      setMessages(msgsData || []);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError(err.message || 'Failed to load game.');
    } finally {
      setLoading(false);
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    fetchFullState();
  }, [fetchFullState]);

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`game-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPlayers((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p)));
            if (payload.new.id === playerId) {
              setCurrentPlayer(payload.new);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clues', filter: `room_id=eq.${room.id}` },
        (payload) => setClues((prev) => (prev.some((c) => c.id === payload.new.id) ? prev : [...prev, payload.new]))
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload) => setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, playerId]);

  return {
    room,
    currentPlayer,
    players,
    clues,
    messages,
    loading,
    error,
    refreshState: fetchFullState,
  };
}

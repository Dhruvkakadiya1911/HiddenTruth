'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabaseRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial room & players
  const fetchRoomData = useCallback(async () => {
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
      if (!roomData) {
        throw new Error(`Room "${roomCode}" not found.`);
      }

      setRoom(roomData);

      // 2. Fetch players in this room
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true });

      if (playersErr) throw playersErr;
      setPlayers(playersData || []);
    } catch (err) {
      console.error('Error fetching room data:', err);
      setError(err.message || 'Failed to load room.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // Realtime subscription for room updates & player joins/leaves
  useEffect(() => {
    if (!room?.id) return;

    const channelName = `room-${room.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id === payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setPlayers((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          setRoom(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  return {
    room,
    players,
    loading,
    error,
    refreshRoom: fetchRoomData,
  };
}

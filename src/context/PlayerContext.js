'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [player, setPlayerState] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYER);
      if (stored) {
        setPlayerState(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load player session:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save or update player in state + localStorage
  const setPlayer = (data) => {
    setPlayerState(data);
    try {
      if (data) {
        localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEYS.PLAYER);
      }
    } catch (err) {
      console.error('Failed to save player session:', err);
    }
  };

  const clearPlayer = () => {
    setPlayerState(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.PLAYER);
    } catch (err) {
      console.error('Failed to clear player session:', err);
    }
  };

  return (
    <PlayerContext.Provider value={{ player, setPlayer, clearPlayer, isLoaded }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

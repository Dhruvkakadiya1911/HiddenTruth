// Game configurations and constants

export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  VOTING: 'voting',
  FINISHED: 'finished',
};

export const ROLES = {
  KILLER: 'killer',
  DETECTIVE: 'detective',
  WITNESS: 'witness',
  SUSPECT: 'suspect',
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const DEFAULT_MAX_ROUNDS = 3;

export const STORAGE_KEYS = {
  PLAYER: 'hiddentruth_player_session',
};

export const TIMER_CONFIG = {
  ROUND_DURATION_SECONDS: 180, // 3 minutes per investigation round
  VOTE_DURATION_SECONDS: 120,  // 2 minutes for final jury vote
};


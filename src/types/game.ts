export type Player = 'X' | 'O';
export type BoardCell = Player | null;
export type Board = BoardCell[];

export type GameMode = 'computer' | 'local' | 'online';
export type AIDifficulty = 'easy' | 'classic' | 'hard';
export type AppTheme = 'light' | 'neon' | 'black' | 'ocean' | 'emerald' | 'crimson';
export type TabScreen = 'home' | 'arena' | 'online' | 'history' | 'ranks' | 'profile' | 'settings';

export interface UserProfile {
  uid: string;
  numericUid?: number; // Sequential XO Arena UID for registered players: 1, 2, 3...
  displayName: string;
  avatarUrl: string | null;
  avatarEmoji?: string;
  isGuest?: boolean;
  xp: number;
  level: number;
  wins: number;
  aiWins: number;
  losses: number;
  draws: number;
  matches: number;
  streak: number;
  bestStreak: number;
  blockedUids: string[];
}

export interface MatchRecord {
  id: string;
  date: string;
  opponent: string;
  mode: string;
  result: 'Win' | 'Loss' | 'Draw';
  moves: number;
}

export interface OnlineMatch {
  matchId: string;
  roomCode?: string;
  playerXUid: string;
  playerXNumericUid?: number;
  playerXName: string;
  playerOUid: string;
  playerONumericUid?: number;
  playerOName: string;
  board: Board;
  currentTurn: Player;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner: Player | 'draw' | null;
  winningLine?: number[];
  round: number;
  restartRequests: string[];
  exitedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatMessage {
  id?: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp?: any;
}

export interface OnlinePlayer {
  uid: string;
  numericUid: number;
  displayName: string;
  avatarUrl: string | null;
  avatarEmoji?: string;
  isOnline: boolean;
  lastSeen?: number;
  level?: number;
}

export interface DirectChallenge {
  id: string;
  senderUid: string;
  senderNumericUid: number;
  senderName: string;
  senderAvatarEmoji?: string;
  targetUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  matchId?: string;
  createdAt?: number;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

import { MatchRecord, UserProfile, Achievement } from '../types/game';

const PREFIX = 'XO_ARENA_';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Blood', desc: 'Win your first match', icon: '🎯' },
  { id: 'win_streak_3', name: 'Hot Streak', desc: 'Reach a win streak of 3 matches', icon: '🔥' },
  { id: 'five_wins', name: 'Veteran Competitor', desc: 'Accumulate 5 total wins', icon: '⚔️' },
  { id: 'first_draw', name: 'Stalemate Master', desc: 'Conclude a match in a draw', icon: '🤝' },
  { id: 'beat_hard_ai', name: 'Cyber Conqueror', desc: 'Defeat the Hard Minimax AI', icon: '🤖' },
  { id: 'online_victor', name: 'Global Dominator', desc: 'Win a live online multiplayer match', icon: '👑' }
];

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage quota or private browsing
    }
  },

  getNextNumericUid(): number {
    const current = this.get<number>('max_local_uid', 1);
    this.set('max_local_uid', current + 1);
    return current;
  },

  getProfile(uid?: string): UserProfile {
    if (uid) {
      const savedUidProfile = this.get<UserProfile | null>(`profile_${uid}`, null);
      if (savedUidProfile) {
        if (!uid.startsWith('guest_')) {
          return { ...savedUidProfile, isGuest: false };
        }
        return savedUidProfile;
      }
    }
    const profile = this.get<UserProfile | null>('player_profile', null);
    if (profile) {
      if (uid && !uid.startsWith('guest_')) {
        return { ...profile, uid, isGuest: false };
      }
      // If guest, ensure numericUid is removed
      if (profile.isGuest) {
        delete profile.numericUid;
      }
      return profile;
    }

    const newProfile: UserProfile = {
      uid: uid || `guest_${Date.now().toString(36)}`,
      displayName: 'Player',
      avatarUrl: null,
      avatarEmoji: '🤖',
      isGuest: true,
      xp: 0,
      level: 1,
      wins: 0,
      aiWins: 0,
      losses: 0,
      draws: 0,
      matches: 0,
      streak: 0,
      bestStreak: 0,
      blockedUids: []
    };
    this.set('player_profile', newProfile);
    return newProfile;
  },

  saveProfile(profile: UserProfile): void {
    this.set('player_profile', profile);
    if (profile.uid) {
      this.set(`profile_${profile.uid}`, profile);
    }
  },

  deleteGuestProfile(): void {
    try {
      localStorage.removeItem(PREFIX + 'player_profile');
    } catch {
      // ignore
    }
  },

  getHistory(): MatchRecord[] {
    return this.get<MatchRecord[]>('match_history', []);
  },

  addHistory(record: MatchRecord): void {
    const history = this.getHistory();
    history.unshift(record);
    if (history.length > 50) history.pop();
    this.set('match_history', history);
  },

  clearHistory(): void {
    this.set('match_history', []);
  },

  getAchievements(): string[] {
    return this.get<string[]>('unlocked_achievements', []);
  },

  unlockAchievement(id: string): boolean {
    const list = this.getAchievements();
    if (!list.includes(id)) {
      list.push(id);
      this.set('unlocked_achievements', list);
      return true;
    }
    return false;
  },

  clearAll(): void {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      });
    } catch {
      // ignore
    }
  }
};

/**
 * Free Fire style progressive XP & Level ramp:
 * Level 1 -> 2 is quick (80 XP, ~1-2 matches).
 * Each subsequent level requires significantly more XP (steep exponent),
 * making leveling up a true badge of honor that requires many matches!
 */
export function getCumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let i = 1; i < level; i++) {
    sum += Math.floor(80 * Math.pow(i, 1.45));
  }
  return sum;
}

export function calculateLevelInfo(xp: number) {
  let level = 1;
  while (xp >= getCumulativeXpForLevel(level + 1) && level < 999) {
    level++;
  }
  const currentLevelBaseXp = getCumulativeXpForLevel(level);
  const nextLevelBaseXp = getCumulativeXpForLevel(level + 1);
  const xpInCurrentLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpNeededForNext = nextLevelBaseXp - currentLevelBaseXp;
  const progress = Math.min(Math.max(Math.round((xpInCurrentLevel / xpNeededForNext) * 100), 0), 100);

  return {
    level,
    xpInCurrentLevel,
    xpNeededForNext,
    progress
  };
}

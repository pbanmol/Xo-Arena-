import { AIDifficulty, OnlinePlayer, UserProfile } from '../types/game';
import { calculateLevelInfo } from './storage';

interface CommunityPlayerSeed {
  id: string;
  numericUid: number;
  displayName: string;
  avatarEmoji: string;
  baseMatches: number;
  winRate: number; // 0.52 - 0.76
  drawRate: number; // 0.08 - 0.16
  dailyMin: number;
  dailyMax: number;
  skillTier: AIDifficulty;
  onlineWeight: number; // controls rotation cadence
}

// Fixed launch epoch so stats grow deterministically day-by-day across every device (offline & online)
const LAUNCH_EPOCH_MS = Date.UTC(2026, 10, 15, 0, 0, 0); // Nov 15, 2026 UTC
const DAY_MS = 24 * 60 * 60 * 1000;

const COMMUNITY_SEEDS: CommunityPlayerSeed[] = [
  { id: 'sim_aarav', numericUid: 104, displayName: 'AaravX', avatarEmoji: '👑', baseMatches: 84, winRate: 0.74, drawRate: 0.10, dailyMin: 5, dailyMax: 11, skillTier: 'hard', onlineWeight: 1 },
  { id: 'sim_kabir', numericUid: 112, displayName: 'Kabir_OP', avatarEmoji: '🔥', baseMatches: 76, winRate: 0.71, drawRate: 0.11, dailyMin: 4, dailyMax: 10, skillTier: 'hard', onlineWeight: 2 },
  { id: 'sim_riya', numericUid: 118, displayName: 'RiyaStrike', avatarEmoji: '⚡', baseMatches: 68, winRate: 0.69, drawRate: 0.12, dailyMin: 4, dailyMax: 9, skillTier: 'hard', onlineWeight: 3 },
  { id: 'sim_vansh', numericUid: 125, displayName: 'VanshPro', avatarEmoji: '🥷', baseMatches: 62, winRate: 0.67, drawRate: 0.11, dailyMin: 3, dailyMax: 9, skillTier: 'classic', onlineWeight: 4 },
  { id: 'sim_rohan', numericUid: 131, displayName: 'RohanKing', avatarEmoji: '🦁', baseMatches: 57, winRate: 0.66, drawRate: 0.12, dailyMin: 3, dailyMax: 8, skillTier: 'classic', onlineWeight: 5 },
  { id: 'sim_zoya', numericUid: 139, displayName: 'ZoyaArena', avatarEmoji: '💎', baseMatches: 52, winRate: 0.64, drawRate: 0.13, dailyMin: 3, dailyMax: 8, skillTier: 'classic', onlineWeight: 6 },
  { id: 'sim_dev', numericUid: 146, displayName: 'Dev_99', avatarEmoji: '🐉', baseMatches: 48, winRate: 0.63, drawRate: 0.12, dailyMin: 3, dailyMax: 7, skillTier: 'classic', onlineWeight: 7 },
  { id: 'sim_ananya', numericUid: 152, displayName: 'AnanyaXO', avatarEmoji: '🎯', baseMatches: 44, winRate: 0.61, drawRate: 0.14, dailyMin: 2, dailyMax: 7, skillTier: 'classic', onlineWeight: 8 },
  { id: 'sim_harsh', numericUid: 159, displayName: 'HarshPlays', avatarEmoji: '🚀', baseMatches: 39, winRate: 0.60, drawRate: 0.13, dailyMin: 2, dailyMax: 7, skillTier: 'classic', onlineWeight: 9 },
  { id: 'sim_vikram', numericUid: 166, displayName: 'VikramAce', avatarEmoji: '🐺', baseMatches: 36, winRate: 0.59, drawRate: 0.14, dailyMin: 2, dailyMax: 6, skillTier: 'classic', onlineWeight: 10 },
  { id: 'sim_neha', numericUid: 173, displayName: 'NehaBlitz', avatarEmoji: '⚡', baseMatches: 32, winRate: 0.58, drawRate: 0.14, dailyMin: 2, dailyMax: 6, skillTier: 'easy', onlineWeight: 11 },
  { id: 'sim_arjun', numericUid: 181, displayName: 'ArjunNova', avatarEmoji: '🤖', baseMatches: 29, winRate: 0.57, drawRate: 0.13, dailyMin: 2, dailyMax: 6, skillTier: 'classic', onlineWeight: 12 },
  { id: 'sim_tanya', numericUid: 188, displayName: 'Tanya_GG', avatarEmoji: '🔥', baseMatches: 26, winRate: 0.56, drawRate: 0.15, dailyMin: 2, dailyMax: 5, skillTier: 'easy', onlineWeight: 13 },
  { id: 'sim_sid', numericUid: 195, displayName: 'SiddharthX', avatarEmoji: '💀', baseMatches: 23, winRate: 0.55, drawRate: 0.14, dailyMin: 1, dailyMax: 5, skillTier: 'easy', onlineWeight: 14 },
  { id: 'sim_meera', numericUid: 204, displayName: 'MeeraStorm', avatarEmoji: '💎', baseMatches: 20, winRate: 0.54, drawRate: 0.15, dailyMin: 1, dailyMax: 5, skillTier: 'easy', onlineWeight: 15 },
  { id: 'sim_kunal', numericUid: 213, displayName: 'KunalFury', avatarEmoji: '🥷', baseMatches: 17, winRate: 0.53, drawRate: 0.14, dailyMin: 1, dailyMax: 4, skillTier: 'easy', onlineWeight: 16 }
];

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function dailyIncrement(id: string, dayIndex: number, min: number, max: number): number {
  const span = Math.max(1, max - min + 1);
  return min + (deterministicHash(`${id}_d_${dayIndex}`) % span);
}

/**
 * Generates deterministic, monotonically increasing daily stats for community players.
 * Every single day (and gently within each day), matches, wins, XP, and level grow strictly higher than yesterday.
 */
export function getDynamicCommunityProfiles(nowMs: number = Date.now()): UserProfile[] {
  const elapsedMs = Math.max(0, nowMs - LAUNCH_EPOCH_MS);
  const fullDays = Math.floor(elapsedMs / DAY_MS);
  const dayFraction = (elapsedMs % DAY_MS) / DAY_MS;

  return COMMUNITY_SEEDS.map((seed) => {
    let totalMatches = seed.baseMatches;
    // Cap loop safely even years in the future while preserving strict monotonic daily growth
    const exactDays = Math.min(fullDays, 400);
    for (let d = 0; d < exactDays; d++) {
      totalMatches += dailyIncrement(seed.id, d, seed.dailyMin, seed.dailyMax);
    }
    if (fullDays > 400) {
      const avgDaily = (seed.dailyMin + seed.dailyMax) / 2;
      totalMatches += Math.floor((fullDays - 400) * avgDaily);
    }

    // Add today's gradual intra-day progress so stats gently increase throughout the day too
    const todayPotential = dailyIncrement(seed.id, fullDays, seed.dailyMin, seed.dailyMax);
    totalMatches += Math.floor(todayPotential * dayFraction);

    const wins = Math.max(1, Math.round(totalMatches * seed.winRate));
    const draws = Math.max(0, Math.round(totalMatches * seed.drawRate));
    const losses = Math.max(0, totalMatches - wins - draws);

    const xp = wins * 60 + draws * 30 + losses * 15;
    const levelInfo = calculateLevelInfo(xp);
    const streak = 1 + (deterministicHash(`${seed.id}_s_${fullDays}`) % 5);
    const bestStreak = Math.max(streak, 4 + (deterministicHash(`${seed.id}_bs`) % 9));

    return {
      uid: seed.id,
      numericUid: seed.numericUid,
      displayName: seed.displayName,
      avatarUrl: null,
      avatarEmoji: seed.avatarEmoji,
      isGuest: false,
      xp,
      level: levelInfo.level,
      wins,
      aiWins: Math.floor(wins * 0.45),
      losses,
      draws,
      matches: totalMatches,
      streak,
      bestStreak,
      blockedUids: []
    };
  });
}

/**
 * Rotates a natural subset of community players as currently "Online" in the lobby
 * so the Online Players list feels alive and dynamic at all hours.
 */
export function getDynamicCommunityOnlinePlayers(nowMs: number = Date.now()): OnlinePlayer[] {
  const profiles = getDynamicCommunityProfiles(nowMs);
  // Rotate active online roster gently every 12 minutes
  const slot = Math.floor(nowMs / (12 * 60 * 1000));

  return profiles
    .filter((prof, idx) => {
      const h = deterministicHash(`${prof.uid}_online_${slot + (idx % 3)}`);
      // ~55% of community players online at any given time (8–10 players)
      return h % 100 < 56;
    })
    .map((prof) => ({
      uid: prof.uid,
      numericUid: prof.numericUid || 100,
      displayName: prof.displayName,
      avatarUrl: prof.avatarUrl,
      avatarEmoji: prof.avatarEmoji,
      isOnline: true,
      level: prof.level,
      lastSeen: nowMs
    }));
}

export function isCommunityPlayerUid(uid?: string | null): boolean {
  return Boolean(uid && uid.startsWith('sim_'));
}

export function getCommunityPlayerSkill(uid: string): AIDifficulty {
  const found = COMMUNITY_SEEDS.find((s) => s.id === uid);
  return found ? found.skillTier : 'classic';
}

export function searchCommunityPlayer(searchTerm: string, nowMs: number = Date.now()): UserProfile | null {
  const clean = searchTerm.trim().toLowerCase();
  if (!clean) return null;
  const profiles = getDynamicCommunityProfiles(nowMs);
  return (
    profiles.find(
      (p) =>
        String(p.numericUid) === clean ||
        p.displayName.toLowerCase().includes(clean)
    ) || null
  );
}

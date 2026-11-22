import { AIDifficulty, OnlinePlayer, UserProfile } from '../types/game';
import { calculateLevelInfo, getCumulativeXpForLevel } from './storage';

interface CommunityPlayerSeed {
  id: string;
  numericUid: number;
  displayName: string;
  firstName: string;
  gender: 'm' | 'f';
  city: string;
  avatarEmoji: string;
  baseLevel: number; // All Top 20 are Level 100+
  baseMatches: number;
  winRate: number; // 0.58 - 0.78
  drawRate: number; // 0.08 - 0.14
  dailyMin: number;
  dailyMax: number;
  skillTier: AIDifficulty;
}

// Fixed launch epoch so stats grow deterministically day-by-day across every device (offline & online)
const LAUNCH_EPOCH_MS = Date.UTC(2026, 10, 15, 0, 0, 0); // Nov 15, 2026 UTC
const DAY_MS = 24 * 60 * 60 * 1000;

const COMMUNITY_SEEDS: CommunityPlayerSeed[] = [
  { id: 'sim_aarav', numericUid: 104, displayName: 'AaravX', firstName: 'Aarav', gender: 'm', city: 'Delhi', avatarEmoji: '👑', baseLevel: 138, baseMatches: 4320, winRate: 0.77, drawRate: 0.09, dailyMin: 12, dailyMax: 22, skillTier: 'hard' },
  { id: 'sim_kabir', numericUid: 112, displayName: 'Kabir_OP', firstName: 'Kabir', gender: 'm', city: 'Chandigarh', avatarEmoji: '🔥', baseLevel: 134, baseMatches: 4050, winRate: 0.75, drawRate: 0.10, dailyMin: 11, dailyMax: 20, skillTier: 'hard' },
  { id: 'sim_riya', numericUid: 118, displayName: 'RiyaStrike', firstName: 'Riya', gender: 'f', city: 'Mumbai', avatarEmoji: '⚡', baseLevel: 131, baseMatches: 3840, winRate: 0.74, drawRate: 0.10, dailyMin: 10, dailyMax: 19, skillTier: 'hard' },
  { id: 'sim_vansh', numericUid: 125, displayName: 'VanshPro', firstName: 'Vansh', gender: 'm', city: 'Mohali', avatarEmoji: '🥷', baseLevel: 128, baseMatches: 3610, winRate: 0.72, drawRate: 0.11, dailyMin: 9, dailyMax: 18, skillTier: 'hard' },
  { id: 'sim_rohan', numericUid: 131, displayName: 'RohanKing', firstName: 'Rohan', gender: 'm', city: 'Jaipur', avatarEmoji: '🦁', baseLevel: 125, baseMatches: 3420, winRate: 0.71, drawRate: 0.11, dailyMin: 9, dailyMax: 17, skillTier: 'classic' },
  { id: 'sim_zoya', numericUid: 139, displayName: 'ZoyaArena', firstName: 'Zoya', gender: 'f', city: 'Bengaluru', avatarEmoji: '💎', baseLevel: 123, baseMatches: 3250, winRate: 0.70, drawRate: 0.11, dailyMin: 8, dailyMax: 16, skillTier: 'classic' },
  { id: 'sim_dev', numericUid: 146, displayName: 'Dev_99', firstName: 'Dev', gender: 'm', city: 'Delhi', avatarEmoji: '🐉', baseLevel: 120, baseMatches: 3080, winRate: 0.69, drawRate: 0.12, dailyMin: 8, dailyMax: 16, skillTier: 'classic' },
  { id: 'sim_ananya', numericUid: 152, displayName: 'AnanyaXO', firstName: 'Ananya', gender: 'f', city: 'Pune', avatarEmoji: '🎯', baseLevel: 118, baseMatches: 2940, winRate: 0.68, drawRate: 0.12, dailyMin: 7, dailyMax: 15, skillTier: 'classic' },
  { id: 'sim_harsh', numericUid: 159, displayName: 'HarshPlays', firstName: 'Harsh', gender: 'm', city: 'Lucknow', avatarEmoji: '🚀', baseLevel: 116, baseMatches: 2790, winRate: 0.67, drawRate: 0.12, dailyMin: 7, dailyMax: 14, skillTier: 'classic' },
  { id: 'sim_vikram', numericUid: 166, displayName: 'VikramAce', firstName: 'Vikram', gender: 'm', city: 'Amritsar', avatarEmoji: '🐺', baseLevel: 114, baseMatches: 2660, winRate: 0.66, drawRate: 0.12, dailyMin: 7, dailyMax: 14, skillTier: 'classic' },
  { id: 'sim_neha', numericUid: 173, displayName: 'NehaBlitz', firstName: 'Neha', gender: 'f', city: 'Noida', avatarEmoji: '⚡', baseLevel: 112, baseMatches: 2520, winRate: 0.65, drawRate: 0.13, dailyMin: 6, dailyMax: 13, skillTier: 'classic' },
  { id: 'sim_arjun', numericUid: 181, displayName: 'ArjunNova', firstName: 'Arjun', gender: 'm', city: 'Hyderabad', avatarEmoji: '🤖', baseLevel: 111, baseMatches: 2410, winRate: 0.65, drawRate: 0.12, dailyMin: 6, dailyMax: 13, skillTier: 'classic' },
  { id: 'sim_tanya', numericUid: 188, displayName: 'Tanya_GG', firstName: 'Tanya', gender: 'f', city: 'Indore', avatarEmoji: '🔥', baseLevel: 109, baseMatches: 2290, winRate: 0.64, drawRate: 0.13, dailyMin: 6, dailyMax: 12, skillTier: 'easy' },
  { id: 'sim_sid', numericUid: 195, displayName: 'SiddharthX', firstName: 'Siddharth', gender: 'm', city: 'Surat', avatarEmoji: '💀', baseLevel: 108, baseMatches: 2180, winRate: 0.63, drawRate: 0.13, dailyMin: 5, dailyMax: 12, skillTier: 'classic' },
  { id: 'sim_meera', numericUid: 204, displayName: 'MeeraStorm', firstName: 'Meera', gender: 'f', city: 'Dehradun', avatarEmoji: '💎', baseLevel: 106, baseMatches: 2070, winRate: 0.62, drawRate: 0.13, dailyMin: 5, dailyMax: 11, skillTier: 'easy' },
  { id: 'sim_kunal', numericUid: 213, displayName: 'KunalFury', firstName: 'Kunal', gender: 'm', city: 'Ludhiana', avatarEmoji: '🥷', baseLevel: 105, baseMatches: 1980, winRate: 0.62, drawRate: 0.13, dailyMin: 5, dailyMax: 11, skillTier: 'classic' },
  { id: 'sim_karan', numericUid: 221, displayName: 'Karan_77', firstName: 'Karan', gender: 'm', city: 'Jalandhar', avatarEmoji: '⚔️', baseLevel: 104, baseMatches: 1890, winRate: 0.61, drawRate: 0.13, dailyMin: 5, dailyMax: 10, skillTier: 'classic' },
  { id: 'sim_simran', numericUid: 229, displayName: 'SimranXO', firstName: 'Simran', gender: 'f', city: 'Patiala', avatarEmoji: '👑', baseLevel: 103, baseMatches: 1810, winRate: 0.61, drawRate: 0.14, dailyMin: 4, dailyMax: 10, skillTier: 'easy' },
  { id: 'sim_aditya', numericUid: 237, displayName: 'AdityaPro', firstName: 'Aditya', gender: 'm', city: 'Bhopal', avatarEmoji: '🐯', baseLevel: 102, baseMatches: 1730, winRate: 0.60, drawRate: 0.14, dailyMin: 4, dailyMax: 10, skillTier: 'classic' },
  { id: 'sim_isha', numericUid: 245, displayName: 'IshaSpark', firstName: 'Isha', gender: 'f', city: 'Gurugram', avatarEmoji: '🦊', baseLevel: 101, baseMatches: 1650, winRate: 0.60, drawRate: 0.14, dailyMin: 4, dailyMax: 9, skillTier: 'easy' },
  { id: 'sim_aman', numericUid: 253, displayName: 'AmanClutch', firstName: 'Aman', gender: 'm', city: 'Kanpur', avatarEmoji: '🦅', baseLevel: 100, baseMatches: 1580, winRate: 0.59, drawRate: 0.14, dailyMin: 4, dailyMax: 9, skillTier: 'classic' },
  { id: 'sim_priya', numericUid: 261, displayName: 'PriyaAce', firstName: 'Priya', gender: 'f', city: 'Ahmedabad', avatarEmoji: '🎯', baseLevel: 100, baseMatches: 1510, winRate: 0.59, drawRate: 0.14, dailyMin: 4, dailyMax: 9, skillTier: 'easy' },
  { id: 'sim_sahil', numericUid: 269, displayName: 'SahilBlitz', firstName: 'Sahil', gender: 'm', city: 'Shimla', avatarEmoji: '🚀', baseLevel: 100, baseMatches: 1460, winRate: 0.58, drawRate: 0.14, dailyMin: 3, dailyMax: 8, skillTier: 'easy' },
  { id: 'sim_manav', numericUid: 277, displayName: 'Manav_OG', firstName: 'Manav', gender: 'm', city: 'Kolkata', avatarEmoji: '🦁', baseLevel: 100, baseMatches: 1410, winRate: 0.58, drawRate: 0.14, dailyMin: 3, dailyMax: 8, skillTier: 'classic' }
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
 * - All Top 20 competitors are Level 100+ and steadily grow every single day (and gently intra-day).
 * - If any real player climbs close to or past Level 100, top competitors automatically scale ahead
 *   so the leaderboard always stays aspirational and competitive.
 */
export function getDynamicCommunityProfiles(
  nowMs: number = Date.now(),
  highestRealLevel: number = 0
): UserProfile[] {
  const elapsedMs = Math.max(0, nowMs - LAUNCH_EPOCH_MS);
  const fullDays = Math.floor(elapsedMs / DAY_MS);
  const dayFraction = (elapsedMs % DAY_MS) / DAY_MS;

  // Adaptive competitive pacing: if a real player approaches or surpasses Level 95+,
  // boost top community tiers smoothly ahead so reaching #1 remains an endless chase
  const adaptiveBoost = highestRealLevel >= 95 ? highestRealLevel - 90 : 0;

  return COMMUNITY_SEEDS.map((seed, rankIdx) => {
    let addedMatches = 0;
    const exactDays = Math.min(fullDays, 400);
    for (let d = 0; d < exactDays; d++) {
      addedMatches += dailyIncrement(seed.id, d, seed.dailyMin, seed.dailyMax);
    }
    if (fullDays > 400) {
      const avgDaily = (seed.dailyMin + seed.dailyMax) / 2;
      addedMatches += Math.floor((fullDays - 400) * avgDaily);
    }

    const todayPotential = dailyIncrement(seed.id, fullDays, seed.dailyMin, seed.dailyMax);
    addedMatches += Math.floor(todayPotential * dayFraction);

    // Also add extra matches proportional to adaptiveBoost so stats look completely natural
    const adaptiveExtraMatches = adaptiveBoost * (22 + Math.max(0, 14 - rankIdx));
    const totalMatches = seed.baseMatches + addedMatches + adaptiveExtraMatches;

    const wins = Math.max(1, Math.round(totalMatches * seed.winRate));
    const draws = Math.max(0, Math.round(totalMatches * seed.drawRate));
    const losses = Math.max(0, totalMatches - wins - draws);

    // Every ~24 added matches grants +1 Level on top of their 100+ veteran tier
    const dailyLevelGain = Math.floor(addedMatches / 24);
    const adaptiveLevelGain = adaptiveBoost > 0 ? adaptiveBoost + Math.max(2, 18 - rankIdx) : 0;
    const targetLevel = Math.min(990, Math.max(100, seed.baseLevel + dailyLevelGain + adaptiveLevelGain));

    // Align XP cleanly with calculateLevelInfo(xp) so Level & XP progress are 100% consistent
    const baseXp = getCumulativeXpForLevel(targetLevel);
    const nextXp = getCumulativeXpForLevel(targetLevel + 1);
    const spanXp = Math.max(100, nextXp - baseXp);
    const intraLevelFrac = ((addedMatches % 24) + dayFraction) / 24;
    const tieBreaker = (COMMUNITY_SEEDS.length - rankIdx) * 37;
    const xp = baseXp + Math.floor(spanXp * Math.min(0.96, intraLevelFrac)) + tieBreaker;

    const levelInfo = calculateLevelInfo(xp);
    const streak = 2 + (deterministicHash(`${seed.id}_s_${fullDays}`) % 7);
    const bestStreak = Math.max(streak, 9 + (deterministicHash(`${seed.id}_bs`) % 15));

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
      aiWins: Math.floor(wins * 0.42),
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
 * Generates a realistic, dynamically varying online roster (4 to 18 active players).
 * Uses both a per-session/login seed and a rolling 4-minute time slot so every login/refresh
 * shows a fresh, natural online count — sometimes fewer (4-7), sometimes medium (8-12),
 * sometimes busy (13-18) — never stuck at a fixed number.
 */
export function getDynamicCommunityOnlinePlayers(
  nowMs: number = Date.now(),
  highestRealLevel: number = 0,
  sessionSeed: number = 0
): OnlinePlayer[] {
  const profiles = getDynamicCommunityProfiles(nowMs, highestRealLevel);
  const slot = Math.floor(nowMs / (4 * 60 * 1000)); // shifts every 4 minutes

  // Pick a dynamic target online count between 4 and 18 based on sessionSeed + rolling slot
  const countHash = deterministicHash(`online_count_${slot}_${sessionSeed}`);
  const possibleCounts = [4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18];
  const targetCount = possibleCounts[countHash % possibleCounts.length];

  // Deterministically shuffle profiles for this slot + sessionSeed and take targetCount
  const ranked = profiles
    .map((prof) => ({
      prof,
      score: deterministicHash(`${prof.uid}_roster_${slot}_${sessionSeed}`)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, targetCount);

  return ranked.map(({ prof }) => ({
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

export function searchCommunityPlayer(
  searchTerm: string,
  nowMs: number = Date.now(),
  highestRealLevel: number = 0
): UserProfile | null {
  const clean = searchTerm.trim().toLowerCase();
  if (!clean) return null;
  const profiles = getDynamicCommunityProfiles(nowMs, highestRealLevel);
  return (
    profiles.find(
      (p) =>
        String(p.numericUid) === clean ||
        p.displayName.toLowerCase().includes(clean)
    ) || null
  );
}

// ==========================================
// NATURAL PERSONA-AWARE MATCH CHAT ENGINE
// ==========================================

function findPersona(uid?: string, fallbackName?: string): CommunityPlayerSeed {
  if (uid) {
    const byId = COMMUNITY_SEEDS.find((s) => s.id === uid);
    if (byId) return byId;
  }
  if (fallbackName) {
    const clean = fallbackName.toLowerCase();
    const byName = COMMUNITY_SEEDS.find(
      (s) => s.displayName.toLowerCase() === clean || s.firstName.toLowerCase() === clean
    );
    if (byName) return byName;
  }
  return COMMUNITY_SEEDS[0];
}

function pickNonRepeating(options: string[], recentReplies: string[] = []): string {
  const recentSet = new Set(recentReplies.slice(-6));
  const fresh = options.filter((opt) => !recentSet.has(opt));
  const pool = fresh.length > 0 ? fresh : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getCommunityGreeting(opponentUid?: string, opponentName?: string): string {
  const p = findPersona(opponentUid, opponentName);
  return pickNonRepeating([
    `Hey! Main ${p.firstName} hoon, ready ho match ke liye? 🔥`,
    `Hello bhai! ${p.firstName} here, good luck 🤝`,
    `Yo! Chalo dekhte hain aaj kaun jeetega ⚡`,
    `Hi! All the best, mast game khelte hain 👑`,
    `Ready? Game on! 🔥`
  ]);
}

export function getCommunityChatReply(
  userMessage: string,
  opponentUid?: string,
  opponentName?: string,
  playerName?: string,
  recentReplies: string[] = []
): string {
  const p = findPersona(opponentUid, opponentName);
  const raw = userMessage.trim();
  const msg = raw.toLowerCase().replace(/[!?.,]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isFemale = p.gender === 'f';
  const khelVerb = isFemale ? 'khel rahi hoon' : 'khel raha hoon';
  const bolVerb = isFemale ? 'bol rahi hoon' : 'bol raha hoon';
  const friendlyTitle = isFemale ? 'yaar' : 'bhai';
  const myDisplayName = playerName && playerName !== 'Player' && playerName !== 'Player X' ? playerName : friendlyTitle;

  // 1. Quick Emoji Reactions
  if (['🔥', '👏', '😮', '🤝', '😂', '💀', '👑'].includes(raw)) {
    const emojiMap: Record<string, string[]> = {
      '🔥': ['🔥🔥 Full Josh!', 'Aag laga di bro! ⚡', 'Maza aa raha hai 🔥'],
      '👏': ['Thanks yaar! 🤝', 'Shukriya! Tum bhi mast khel rahe ho 👏', 'Nice move! 🔥'],
      '😮': ['Surprise ho gaye kya? 😂', 'Close call tha na! ⚡', 'Haha abhi aur dekho 😮'],
      '🤝': ['🤝 Respect!', 'Good sportsmanship bro 👏', 'Best match! 🤝🔥'],
      '😂': ['😂😂 Kya baat hai!', 'Haha haso mat, agli turn meri hai 😎', 'Mast chal raha hai 😂'],
      '💀': ['💀 Bach gaye abhi!', 'Arre khatam nahi hua abhi 😂', 'Plot twist aane wala hai ⚡'],
      '👑': ['👑 Dekhte hain crown kiska hoga!', 'King mode ON 🔥', 'Challenge accepted! 👑']
    };
    return pickNonRepeating(emojiMap[raw] || ['🔥'], recentReplies);
  }

  // 2. Identity / Who are you / Name questions ("kaun ho", "who are you", "tumhara naam", "kon h")
  if (
    /\b(kaun|kon|koun|who are you|who r u|who is this|your name|naam kya|name kya|naam bata|apna naam|tum kon|tu kon|aap kaun|naam)\b/.test(msg) ||
    msg === 'name' ||
    msg === 'who'
  ) {
    return pickNonRepeating(
      [
        `Main ${p.firstName} hoon (${p.displayName})! ${p.city} se ${khelVerb} 😄`,
        `Mera naam ${p.firstName} hai ${friendlyTitle}! Tumhara naam kya hai?`,
        `Main ${p.firstName} ${bolVerb} — XO Arena UID ${p.numericUid}! Tum batao? 🔥`,
        `${p.firstName} naam hai mera! ${p.city} se hoon, chalo badhiya match khelte hain ⚡`
      ],
      recentReplies
    );
  }

  // 3. How are you / Wellbeing ("how are you", "kaise ho", "kya haal", "kaisa hai", "sab theek")
  if (
    /\b(how are you|how r u|how are u|hru|kaise ho|kese ho|kaisa hai|kaisi ho|kya haal|haal chaal|theek ho|thik ho|sab badhiya|sab badiya|whats up|wassup|wsp|kya chal raha|aur batao|aur sunao|kya ho raha)\b/.test(
      msg
    )
  ) {
    return pickNonRepeating(
      [
        `Main bilkul badhiya hoon ${myDisplayName}! Tum sunao kaise ho? 😄`,
        `Ekdam mast! Bas free time mein XO Arena ${khelVerb}, tum kaise ho? 🔥`,
        `Main theek hoon ${friendlyTitle}, sab badhiya chal raha hai! Tum batao? 🤝`,
        `Full energetic hoon aaj! Tumhara din kaisa ja raha hai? ⚡`
      ],
      recentReplies
    );
  }

  // 4. User answering "I am fine / good / badhiya / mast"
  if (
    /\b(i am fine|im fine|i m fine|am fine|fine|main theek|mai theek|me theek|main thik|mai thik|badhiya hoon|badiya hu|mast hu|mast hoon|all good|good here|ekdam mast|ekdum mast)\b/.test(
      msg
    )
  ) {
    return pickNonRepeating(
      [
        `Badiya sun ke accha laga! Chalo ab full focus se khelte hain 🔥`,
        `Sahi hai ${friendlyTitle}! Ready ho agli chaal ke liye? ⚡`,
        `Great! Waise tum kahan se ho? 😄`,
        `Nice! Chalo dekhte hain ye round kaun jeetega 👑`
      ],
      recentReplies
    );
  }

  // 5. Location / Where are you from ("kahan se ho", "where are you from", "city", "kidhar se")
  if (
    /\b(where are you from|where r u from|where from|kahan se|kaha se|kidhar se|kis city|which city|city|state|rehte ho|rehti ho|rehta hai|location|address)\b/.test(
      msg
    )
  ) {
    return pickNonRepeating(
      [
        `Main ${p.city} se hoon! Tum kahan se ho ${myDisplayName}? 😄`,
        `${p.city} se ${khelVerb} ${friendlyTitle}! Tumhari city kaunsi hai?`,
        `Hum ${p.city} wale hain bro 🔥 Tum kahan se khel rahe ho?`
      ],
      recentReplies
    );
  }

  // 6. Asking if bot / fake / real ("bot", "fake", "ai", "real", "computer")
  if (/\b(bot|fake|ai|robot|computer|real ho|asli ho|insaan|human)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Haha nahi yaar, main ${p.firstName} hoon — phone pe ${khelVerb} 😂`,
        `Arre bot kyun lag ${isFemale ? 'rahi' : 'raha'} hoon? ${p.firstName} naam hai mera ${p.city} se! 😄`,
        `Nahi bhai real player hoon! Dekhna abhi match mein 🔥`,
        `Haha itna fast khel ${khelVerb.replace('khel ', '')} isliye bot bol rahe ho kya? 😂`
      ],
      recentReplies
    );
  }

  // 7. Age / Study / Work / What are you doing ("age", "kya karte ho", "kya kar rahe ho", "college", "school", "job")
  if (
    /\b(age|kitne saal|old are you|kya karte|kya karti|kya kar rahe|kya kar rahi|what are you doing|what do you do|student|college|school|job|kaam|work|padhai)\b/.test(
      msg
    )
  ) {
    return pickNonRepeating(
      [
        `Abhi to bas free time mein XO Arena ${khelVerb} 😄 Tum kya karte ho?`,
        `Main college student hoon ${p.city} mein, gaming bahut pasand hai 🔥`,
        `Bas thoda chill kar ${isFemale ? 'rahi' : 'raha'} tha, socha 2-3 match khel loon! Tum batao?`,
        `Daily thoda time nikal ke rank push kar ${isFemale ? 'rahi hoon' : 'raha hoon'} 💪`
      ],
      recentReplies
    );
  }

  // 8. Asking about level / rank / how you play so well ("level", "rank", "itna high", "kaise badhaya", "pro")
  if (/\b(level|lvl|rank|leaderboard|xp|kitne match|kaise badhaya|itna jyada|itna zyada)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Roz 10-15 match khelta hoon ${friendlyTitle}, tab jaake itna level bana hai 🔥`,
        `Daily practice aur streak se XP jaldi badhta hai! Tum bhi pahunch jaoge 💪`,
        `Kaafi time se XO Arena ${khelVerb}, ab aadat si ho gayi hai 😄👑`
      ],
      recentReplies
    );
  }

  // 9. Friend / UID / Contact ("friend", "dost", "uid", "id", "insta", "instagram", "number", "whatsapp")
  if (/\b(friend|dost|uid|insta|instagram|number|whatsapp|snap|contact|add me|add kar)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Meri XO Arena UID ${p.numericUid} hai! Kabhi bhi search karke challenge kar dena 🤝`,
        `Bilkul dost! Yahin XO Arena pe roz milenge, UID ${p.numericUid} yaad rakhna 🔥`,
        `Insta wagaira yahan share nahi karta yaar, par Arena pe roz active rehta hoon 😄`
      ],
      recentReplies
    );
  }

  // 10. Greetings ("hi", "hello", "hey", "namaste", "sat sri akal", "salam", "bhai", "bro")
  if (
    /\b(hi|hii|hiii|hello|helo|hlo|hey|heyy|yo|namaste|namaskar|ram ram|sat sri akal|ssa|salam|assalam|good morning|good evening|good afternoon|gm)\b/.test(
      msg
    )
  ) {
    return pickNonRepeating(
      [
        `Hey ${myDisplayName}! Main ${p.firstName} hoon, kaise ho? 😄`,
        `Hello ${friendlyTitle}! Ready ho mast match ke liye? 🔥`,
        `Hii! ${p.firstName} here, chalo dekhte hain aaj kaun jeetega ⚡`,
        `Namaste ${friendlyTitle}! All the best for the game 🤝`
      ],
      recentReplies
    );
  }

  // 11. Compliments / GG ("gg", "nice", "good", "well played", "op", "mast", "badiya", "sahi", "awesome", "great")
  if (/\b(gg|nice|good game|well played|wp|op|mast|badiya|badhiya|sahi|awesome|great|amazing|best|super|wah|waah|kya baat)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Thanks ${myDisplayName}! Tum bhi kaafi smart khel rahe ho 👏`,
        `Shukriya ${friendlyTitle}! Mazaa aa raha hai tumhare saath khel ke 🔥`,
        `GG! Bahut tagda competition de rahe ho 🤝`,
        `Haha thanks! Tumhari moves bhi kamal ki hain ⚡`
      ],
      recentReplies
    );
  }

  // 12. Teasing / Challenge / Competitive banter ("haha", "lol", "noob", "easy", "ez", "haar", "jeet", "dekhna")
  if (/\b(haha|hahaha|lol|lmao|noob|nub|easy|ez|haar|har gaya|hara dunga|jeet|jitunga|dekhna|ab dekh|bach ke|darr|dar)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Haha itni jaldi khush mat ho ${myDisplayName}, abhi game baaki hai 😂🔥`,
        `Achha ji? Chalo board pe dikhao phir 😎⚡`,
        `Overconfident mat bano ${friendlyTitle}, meri agli move dekho 🔥`,
        `Haha dekhte hain aakhiri move mein kaun jeetega 👑`
      ],
      recentReplies
    );
  }

  // 13. Rematch / Play again / Speed ("rematch", "again", "ek aur", "fir se", "phir se", "fast", "jaldi", "wait", "ruko")
  if (/\b(rematch|again|ek aur|fir se|phir se|one more|aur khelo|restart)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Haan bilkul! Restart dabao, ek aur round lagate hain 🔥`,
        `Done! Main ready hoon rematch ke liye ⚡`,
        `Chalo ek aur ho jaye, full focus ab 👑`
      ],
      recentReplies
    );
  }

  if (/\b(wait|ruko|ruk|hold on|1 min|one sec|fast|jaldi|slow)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Koi baat nahi, aaram se chalo apni turn 👍`,
        `Haha soch samajh ke chal ${isFemale ? 'rahi hoon' : 'raha hoon'} 😄`,
        `Chalo fast khelte hain ab! ⚡`
      ],
      recentReplies
    );
  }

  // 14. Thanks / Sorry / Bye
  if (/\b(thanks|thank you|thankyou|thx|ty|shukriya|dhanyawad)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Welcome ${myDisplayName}! 🤝`,
        `Koi baat nahi ${friendlyTitle}, enjoy the game! 😄`,
        `Always welcome! 🔥`
      ],
      recentReplies
    );
  }

  if (/\b(sorry|sry|maaf|galti|mistake)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Arre koi baat nahi ${friendlyTitle}, chill! 🤝`,
        `It’s okay yaar, bas enjoy karo game 😄`
      ],
      recentReplies
    );
  }

  if (/\b(bye|by|tata|cya|exit|ja raha|ja rahi|leaving|good night|gn)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Okay ${myDisplayName}, accha laga tumhare saath khel ke! Bye 👋`,
        `GG ${friendlyTitle}! Phir milenge XO Arena mein 🤝🔥`,
        `Bye! Take care, phir challenge karna 😄`
      ],
      recentReplies
    );
  }

  // 15. Short acknowledgements ("ok", "hmm", "haan", "yes", "no", "nahi")
  if (/\b(ok|okay|okk|hmm|hmmm|haan|han|hn|yes|yep|yeah|yup|sahi hai|theek hai|thik hai)\b/.test(msg) && msg.length <= 16) {
    return pickNonRepeating(
      [
        `Chalo apni next move chalo! ⚡`,
        `Haan bilkul! Full concentration now 🔥`,
        `Nice! Dekhte hain ye round kaisa jata hai 😄`
      ],
      recentReplies
    );
  }

  if (/\b(no|nope|nahi|nhi|naa)\b/.test(msg) && msg.length <= 12) {
    return pickNonRepeating(
      [
        `Haha theek hai ${friendlyTitle}! Chalo board pe dhyan dete hain 😄`,
        `Koi baat nahi, game continue karte hain ⚡`
      ],
      recentReplies
    );
  }

  // 16. Question fallback vs Statement fallback (natural, never robotic!)
  if (raw.includes('?') || /\b(kya|kyu|kyun|kaise|kab|kahan|why|what|when|which)\b/.test(msg)) {
    return pickNonRepeating(
      [
        `Haha accha sawal hai ${myDisplayName}! Pehle ye round khatam karein? 😄`,
        `Abhi full focus board pe hai ${friendlyTitle}, match ke baad baat karte hain 🔥`,
        `Sahi kaha, waise tum roz khelte ho XO Arena? ⚡`,
        `Interesting! Tumhara best win streak kitna hai abhi tak? 👑`
      ],
      recentReplies
    );
  }

  return pickNonRepeating(
    [
      `Sahi baat hai ${myDisplayName}! Chalo dekhte hain agli move 🔥`,
      `Haha nice! Tum kahan se khel rahe ho waise? 😄`,
      `Accha laga baat karke, match bhi kaafi interesting ho raha hai ⚡`,
      `Tough match chal raha hai ${friendlyTitle}, full maza aa raha hai! 🤝`,
      `Board pe dhyan rakhna, main trap set kar ${isFemale ? 'rahi hoon' : 'raha hoon'} 😎`,
      `Badiya khel rahe ho yaar! Keep it up 👏`
    ],
    recentReplies
  );
}

export function getCommunityResultReaction(
  result: 'win' | 'loss' | 'draw',
  opponentUid?: string,
  opponentName?: string,
  recentReplies: string[] = []
): string {
  const p = findPersona(opponentUid, opponentName);
  if (result === 'win') {
    return pickNonRepeating(
      [
        `GG! Bahut badhiya khela tumne 👏 Ek aur rematch?`,
        `Wah bhai jeet gaye! Main ${p.firstName} hoon, agli baar badla loonga 🔥`,
        `Well played yaar! Solid moves the tumhare 🤝`
      ],
      recentReplies
    );
  }
  if (result === 'loss') {
    return pickNonRepeating(
      [
        `GG! Ye round mera tha 🔥 Rematch lagayein?`,
        `Haha close match tha! Phir se try karo ⚡`,
        `Good game! Ek aur round khelna hai? 👑`
      ],
      recentReplies
    );
  }
  return pickNonRepeating(
    [
      `Kya baat hai, ekdam barabar ka match! Draw 🤝`,
      `So close yaar! Ek aur round mein faisla karte hain 🔥`,
      `Tough draw! Dono sahi khele 😮👏`
    ],
    recentReplies
  );
}

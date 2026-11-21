import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  deleteDoc,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database';
import { Board, DirectChallenge, OnlineMatch, OnlinePlayer, Player, UserProfile } from '../types/game';
import { checkWinner } from './ai';
import { storage, calculateLevelInfo } from './storage';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyADC-0YI3R46VMkGEnUQqNAk79g-QFfEDE",
  authDomain: "xo-arena-16ccf.firebaseapp.com",
  databaseURL: "https://xo-arena-16ccf-default-rtdb.firebaseio.com",
  projectId: "xo-arena-16ccf",
  storageBucket: "xo-arena-16ccf.firebasestorage.app",
  messagingSenderId: "344252132891",
  appId: "1:344252132891:web:dc839e5e13c5820b9f52be"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// State tracking
let presenceHeartbeat: any = null;

const OWNER_EMAILS = ['pbanmol025@gmail.com', 'anmolpreetsingh47902@gmail.com'];

function isOwnerAccount(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Sequential Incremental UID Generator (2, 3, 4...)
 * UID 1 is reserved for the Arena creator (PBX); all other registered players get unique sequential IDs.
 */
export async function getNextServerNumericUid(): Promise<number> {
  const counterRef = doc(db, 'counters', 'players');
  try {
    const nextNum = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      let current = 1;
      if (snap.exists() && typeof snap.data().currentUid === 'number') {
        current = Math.max(current, snap.data().currentUid);
      }
      const next = current + 1;
      tx.set(counterRef, { currentUid: next }, { merge: true });
      return next;
    });
    return nextNum;
  } catch {
    return Math.max(2, storage.getNextNumericUid());
  }
}

/**
 * Auth state listener:
 * If an active session exists (user already logged in or guest), connects immediately.
 */
export function initAuthListener(onUserChange: (user: User | null) => void): Unsubscribe {
  try {
    return onAuthStateChanged(
      auth,
      (user) => {
        onUserChange(user);
      },
      () => {
        onUserChange(null);
      }
    );
  } catch {
    setTimeout(() => onUserChange(null), 0);
    return () => {};
  }
}

export async function loginWithEmail(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string, fullName: string, avatarEmoji: string = '🤖') {
  const userCred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCred.user, { displayName: fullName });

  const assignedNumericUid = await getNextServerNumericUid();

  await setDoc(doc(db, 'users', userCred.user.uid), {
    uid: userCred.user.uid,
    numericUid: assignedNumericUid,
    displayName: fullName,
    avatarUrl: null,
    avatarEmoji,
    isGuest: false,
    level: 1,
    aiWins: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    matches: 0,
    streak: 0,
    bestStreak: 0,
    xp: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return userCred.user;
}

/**
 * Guest Session:
 * Strictly client-side ONLY! No Firestore doc is created, no UID is assigned,
 * and no anonymous Firebase Auth user is created.
 */
export async function createGuestSession(displayName: string = 'Guest Player', avatarEmoji: string = '🤖'): Promise<UserProfile> {
  const guestProf: UserProfile = {
    uid: `guest_${Date.now().toString(36)}`,
    displayName,
    avatarUrl: null,
    avatarEmoji,
    isGuest: true,
    level: 1,
    aiWins: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    matches: 0,
    streak: 0,
    bestStreak: 0,
    xp: 0,
    blockedUids: []
  };

  storage.saveProfile(guestProf);
  return guestProf;
}

/**
 * When logging out:
 * If guest, clean local guest state. If registered, sign out from Firebase Auth.
 */
export async function logOut(isGuest: boolean = false) {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const uid = currentUser.uid;
    try {
      await set(ref(rtdb, `/status/${uid}`), {
        isOnline: false,
        lastSeen: Date.now(),
        updatedAt: Date.now()
      });
    } catch {
      // ignore
    }

    if (currentUser.isAnonymous) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch {
        // ignore
      }
    }
    await signOut(auth);
  }
  if (isGuest) {
    storage.deleteGuestProfile();
  }
}

/**
 * Setup Realtime Database presence
 */
/**
 * Setup Realtime Database presence - registered players only
 */
export function setupPresence(user: User, profile: UserProfile) {
  if (!user || user.isAnonymous || profile.isGuest) return () => {};

  if (presenceHeartbeat) {
    clearInterval(presenceHeartbeat);
    presenceHeartbeat = null;
  }

  const uid = user.uid;
  const statusRef = ref(rtdb, `/status/${uid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const updateOnline = async () => {
    try {
      const now = Date.now();
      await set(statusRef, {
        uid,
        numericUid: profile.numericUid || 1,
        isOnline: true,
        displayName: profile.displayName || 'Player',
        avatarUrl: profile.avatarUrl || null,
        avatarEmoji: profile.avatarEmoji || '🤖',
        level: profile.level || 1,
        lastSeen: now,
        updatedAt: now
      });
    } catch {
      // ignore
    }
  };

  const markOfflineNow = () => {
    try {
      set(statusRef, {
        uid,
        numericUid: profile.numericUid || 1,
        isOnline: false,
        lastSeen: Date.now(),
        updatedAt: Date.now()
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const unsub = onValue(connectedRef, async (snap) => {
    if (snap.val() === true) {
      try {
        await onDisconnect(statusRef).set({
          uid,
          numericUid: profile.numericUid || 1,
          isOnline: false,
          lastSeen: rtdbServerTimestamp(),
          updatedAt: rtdbServerTimestamp()
        });
        await updateOnline();
      } catch {
        // ignore
      }
    }
  });

  const handlePageHide = () => markOfflineNow();
  const handleOnlineBack = () => updateOnline();

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('online', handleOnlineBack);
  }

  presenceHeartbeat = setInterval(() => {
    updateOnline();
  }, 12000);

  return () => {
    unsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      window.removeEventListener('online', handleOnlineBack);
    }
    if (presenceHeartbeat) {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
    }
  };
}

/**
 * Ensures the currently signed-in registered user has a permanent, valid numeric UID
 * without violating Firestore security rules by writing to other users' documents.
 */
export async function stabilizePermanentPlayerUids(): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;

  try {
    const myRef = doc(db, 'users', user.uid);
    const snap = await getDoc(myRef);
    const owner = isOwnerAccount(user.email);

    if (snap.exists()) {
      const existingNum = Number(snap.data().numericUid || 0);
      let desiredNum = existingNum;

      if (owner) {
        desiredNum = 1;
      } else if (!existingNum || existingNum < 2) {
        desiredNum = await getNextServerNumericUid();
      }

      if (desiredNum !== existingNum) {
        await updateDoc(myRef, {
          numericUid: desiredNum,
          updatedAt: serverTimestamp()
        });
      }

      const prof = storage.getProfile(user.uid);
      if (prof.numericUid !== desiredNum) {
        prof.numericUid = desiredNum;
        storage.saveProfile(prof);
      }
    }
  } catch (e) {
    console.warn('Permanent UID sync notice:', e);
  }
}

/**
 * Sync profile with Firestore & calculate Free Fire style Level.
 * Guests NEVER write to Firestore (100% localStorage only).
 */
export async function syncUserProfile(profile: UserProfile, isExplicitUpdate: boolean = false): Promise<UserProfile> {
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    return profile;
  }
  const uid = auth.currentUser.uid;
  const owner = isOwnerAccount(auth.currentUser.email);
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const totalXp = Math.max(Number(profile.xp || 0), Number(data.xp || 0));
      const levelCalc = calculateLevelInfo(totalXp);

      // Keep each user's unique numericUid; owner is permanently 1
      let finalNumericUid = Number(data.numericUid || profile.numericUid || 0);
      if (owner) {
        finalNumericUid = 1;
      } else if (!finalNumericUid || finalNumericUid < 2) {
        finalNumericUid = await getNextServerNumericUid();
      }

      let finalAvatarUrl: string | null = null;
      if (isExplicitUpdate || profile.avatarUrl !== undefined) {
        finalAvatarUrl = profile.avatarUrl;
      } else if (data.avatarUrl !== undefined) {
        finalAvatarUrl = data.avatarUrl;
      }

      const finalDisplayName = isExplicitUpdate
        ? (profile.displayName?.trim() || data.displayName || 'Player')
        : (data.displayName?.trim() || profile.displayName?.trim() || 'Player');
      const finalAvatarEmoji = isExplicitUpdate
        ? (profile.avatarEmoji || data.avatarEmoji || '🤖')
        : (data.avatarEmoji || profile.avatarEmoji || '🤖');

      const updated: UserProfile = {
        ...profile,
        uid,
        numericUid: finalNumericUid,
        displayName: finalDisplayName,
        avatarUrl: finalAvatarUrl,
        avatarEmoji: finalAvatarEmoji,
        isGuest: false,
        aiWins: Math.max(Number(profile.aiWins || 0), Number(data.aiWins || 0)),
        wins: Math.max(Number(profile.wins || 0), Number(data.wins || 0)),
        losses: Math.max(Number(profile.losses || 0), Number(data.losses || 0)),
        draws: Math.max(Number(profile.draws || 0), Number(data.draws || 0)),
        matches: Math.max(Number(profile.matches || 0), Number(data.matches || 0)),
        xp: totalXp,
        level: levelCalc.level,
        streak: Number(profile.streak ?? data.streak ?? 0),
        bestStreak: Math.max(Number(profile.bestStreak || 0), Number(data.bestStreak || 0)),
        blockedUids: Array.isArray(data.blockedUids) ? data.blockedUids : (profile.blockedUids || [])
      };

      await setDoc(userRef, {
        uid,
        numericUid: updated.numericUid,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        avatarEmoji: updated.avatarEmoji,
        isGuest: false,
        aiWins: updated.aiWins,
        wins: updated.wins,
        losses: updated.losses,
        draws: updated.draws,
        matches: updated.matches,
        xp: updated.xp,
        level: updated.level,
        streak: updated.streak,
        bestStreak: updated.bestStreak,
        blockedUids: updated.blockedUids,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return updated;
    } else {
      const assignedUid = owner ? 1 : await getNextServerNumericUid();
      const totalXp = Number(profile.xp || 0);
      const levelCalc = calculateLevelInfo(totalXp);

      const newProf: UserProfile = {
        ...profile,
        uid,
        numericUid: assignedUid,
        isGuest: false,
        level: levelCalc.level
      };

      await setDoc(userRef, {
        uid,
        numericUid: assignedUid,
        displayName: profile.displayName || 'Player',
        avatarUrl: profile.avatarUrl || null,
        avatarEmoji: profile.avatarEmoji || '🤖',
        isGuest: false,
        aiWins: profile.aiWins || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        draws: profile.draws || 0,
        matches: profile.matches || 0,
        xp: totalXp,
        level: levelCalc.level,
        streak: profile.streak || 0,
        bestStreak: profile.bestStreak || 0,
        blockedUids: profile.blockedUids || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      return newProf;
    }
  } catch (err) {
    console.warn('Sync profile notice:', err);
    return profile;
  }
}

function parseOnlinePlayersSnapshot(val: Record<string, any> | null): OnlinePlayer[] {
  const safeVal = val || {};
  const now = Date.now();
  const list: OnlinePlayer[] = [];

  Object.entries(safeVal).forEach(([uid, data]: [string, any]) => {
    if (
      data &&
      data.isOnline === true &&
      (now - Number(data.updatedAt || data.lastSeen || 0)) < 75000 &&
      data.displayName
    ) {
      list.push({
        uid,
        numericUid: Number(data.numericUid || 1),
        displayName: data.displayName,
        avatarUrl: data.avatarUrl || null,
        avatarEmoji: data.avatarEmoji || '🤖',
        isOnline: true,
        level: Number(data.level || 1),
        lastSeen: data.lastSeen
      });
    }
  });

  return list;
}

/**
 * Listen to list of active online players.
 * Only real connected players with active heartbeat (< 75s) appear. No fake users!
 */
export function listenToOnlinePlayers(_currentUid: string, onUpdate: (players: OnlinePlayer[]) => void): Unsubscribe {
  const statusRef = ref(rtdb, '/status');
  return onValue(statusRef, (snapshot) => {
    onUpdate(parseOnlinePlayersSnapshot(snapshot.val()));
  }, (err) => {
    console.warn('Online players notice:', err);
  });
}

/**
 * Explicitly fetch latest active online players from RTDB
 */
export async function fetchOnlinePlayersOnce(): Promise<OnlinePlayer[]> {
  try {
    const snap = await get(ref(rtdb, '/status'));
    return parseOnlinePlayersSnapshot(snap.val());
  } catch {
    return [];
  }
}

/**
 * Search real user by Numeric UID (1, 2, 20...) or Display Name
 */
export async function searchUserByNumericUidOrName(searchTerm: string): Promise<UserProfile | null> {
  const term = searchTerm.trim();
  if (!term) return null;

  // 1. Search by Numeric UID if term is numeric
  const asNumber = parseInt(term, 10);
  if (!isNaN(asNumber) && String(asNumber) === term) {
    // If searching own numeric UID, return own profile directly!
    const myProfile = storage.getProfile();
    if (myProfile.numericUid === asNumber && auth.currentUser) {
      return {
        ...myProfile,
        uid: auth.currentUser.uid
      };
    }

    try {
      const q = query(collection(db, 'users'), where('numericUid', '==', asNumber), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          uid: d.id,
          numericUid: Number(data.numericUid || asNumber),
          displayName: data.displayName || 'Player',
          avatarUrl: data.avatarUrl || null,
          avatarEmoji: data.avatarEmoji || '🤖',
          xp: Number(data.xp || 0),
          level: Number(data.level || 1),
          wins: Number(data.wins || 0),
          aiWins: Number(data.aiWins || 0),
          losses: Number(data.losses || 0),
          draws: Number(data.draws || 0),
          matches: Number(data.matches || 0),
          streak: Number(data.streak || 0),
          bestStreak: Number(data.bestStreak || 0),
          blockedUids: data.blockedUids || []
        };
      }
    } catch {
      // ignore
    }
  }

  // 2. Search by Display Name
  try {
    const q = query(collection(db, 'users'), where('displayName', '==', term), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      return {
        uid: d.id,
        numericUid: Number(data.numericUid || 1),
        displayName: data.displayName || 'Player',
        avatarUrl: data.avatarUrl || null,
        avatarEmoji: data.avatarEmoji || '🤖',
        xp: Number(data.xp || 0),
        level: Number(data.level || 1),
        wins: Number(data.wins || 0),
        aiWins: Number(data.aiWins || 0),
        losses: Number(data.losses || 0),
        draws: Number(data.draws || 0),
        matches: Number(data.matches || 0),
        streak: Number(data.streak || 0),
        bestStreak: Number(data.bestStreak || 0),
        blockedUids: data.blockedUids || []
      };
    }

    // Case-insensitive fallback
    const allSnap = await getDocs(query(collection(db, 'users'), limit(50)));
    const lower = term.toLowerCase();
    for (const d of allSnap.docs) {
      const data = d.data();
      if (data.displayName && data.displayName.toLowerCase().includes(lower)) {
        return {
          uid: d.id,
          numericUid: Number(data.numericUid || 1),
          displayName: data.displayName || 'Player',
          avatarUrl: data.avatarUrl || null,
          avatarEmoji: data.avatarEmoji || '🤖',
          xp: Number(data.xp || 0),
          level: Number(data.level || 1),
          wins: Number(data.wins || 0),
          aiWins: Number(data.aiWins || 0),
          losses: Number(data.losses || 0),
          draws: Number(data.draws || 0),
          matches: Number(data.matches || 0),
          streak: Number(data.streak || 0),
          bestStreak: Number(data.bestStreak || 0),
          blockedUids: data.blockedUids || []
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * REAL-TIME ATOMIC QUICK MATCHMAKING:
 * Runs directly on the `matches` collection (status: 'waiting_quick') so it works
 * immediately with standard match rules, needs zero composite indexes, prevents
 * simultaneous-click deadlocks via deterministic tie-breaking, and ignores stale tickets.
 */
export async function joinMatchmakingQueue(
  profile: UserProfile,
  onMatched: (matchId: string, role: Player) => void,
  onStatusChange: (status: string) => void
) {
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('Please sign in with an account to use Quick Match.');
  }

  const uid = auth.currentUser.uid;
  const matchesColl = collection(db, 'matches');
  const waitingQuery = query(matchesColl, where('status', '==', 'waiting_quick'), limit(25));
  const STALE_WINDOW_MS = 50000;

  let hasMatched = false;
  let isCancelled = false;
  let isPairing = false;
  let myMatchRef: ReturnType<typeof doc> | null = null;
  let myMatchId: string | null = null;
  let myQueuedAt = Date.now();

  let unsubMyMatch: Unsubscribe | null = null;
  let unsubWaiting: Unsubscribe | null = null;
  let pollingTimer: any = null;
  let heartbeatTimer: any = null;

  const cleanupListeners = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (unsubMyMatch) {
      unsubMyMatch();
      unsubMyMatch = null;
    }
    if (unsubWaiting) {
      unsubWaiting();
      unsubWaiting = null;
    }
  };

  const finishMatch = (matchId: string, role: Player) => {
    if (hasMatched || isCancelled) return;
    hasMatched = true;
    cleanupListeners();
    onMatched(matchId, role);
  };

  const deleteMyWaitingDoc = async () => {
    if (!myMatchRef) return;
    const refToDelete = myMatchRef;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(refToDelete);
        if (snap.exists() && snap.data().status === 'waiting_quick' && !snap.data().playerOUid) {
          tx.delete(refToDelete);
        }
      });
    } catch {
      // ignore cleanup failures
    }
  };

  onStatusChange('Searching for opponent...');

  // Step 1: Remove any old stale waiting_quick docs belonging to this user and look for live opponents
  try {
    const existingSnaps = await getDocs(waitingQuery);
    const now = Date.now();
    const candidates: { id: string; queuedAt: number; playerXUid: string }[] = [];

    for (const d of existingSnaps.docs) {
      const data = d.data() as OnlineMatch;
      const age = now - Number(data.queuedAt || 0);
      if (data.playerXUid === uid) {
        deleteDoc(d.ref).catch(() => {});
        continue;
      }
      if (!data.playerOUid && age >= -15000 && age < STALE_WINDOW_MS) {
        candidates.push({
          id: d.id,
          queuedAt: Number(data.queuedAt || 0),
          playerXUid: data.playerXUid
        });
      }
    }

    // Prefer the longest-waiting live opponent
    candidates.sort((a, b) => a.queuedAt - b.queuedAt);

    for (const cand of candidates) {
      if (hasMatched || isCancelled) break;
      const candRef = doc(db, 'matches', cand.id);
      try {
        const claimed = await runTransaction(db, async (tx) => {
          const snap = await tx.get(candRef);
          if (!snap.exists()) return false;
          const m = snap.data() as OnlineMatch;
          if (m.status !== 'waiting_quick' || m.playerOUid || m.playerXUid === uid) return false;
          if (Date.now() - Number(m.queuedAt || 0) >= STALE_WINDOW_MS) return false;

          tx.update(candRef, {
            playerOUid: uid,
            playerONumericUid: profile.numericUid || 1,
            playerOName: profile.displayName || 'Player O',
            status: 'active',
            updatedAt: serverTimestamp()
          });
          return true;
        });

        if (claimed) {
          finishMatch(cand.id, 'O');
          return { cancel: async () => {} };
        }
      } catch {
        // Another player may have claimed this slot simultaneously; continue to next candidate
      }
    }
  } catch (err) {
    console.warn('Initial matchmaking scan notice:', err);
  }

  if (isCancelled || hasMatched) {
    return { cancel: async () => {} };
  }

  // Step 2: No waiting opponent found yet -> create our own waiting ticket in `matches`
  myMatchRef = doc(matchesColl);
  myMatchId = myMatchRef.id;
  myQueuedAt = Date.now();

  const waitingMatch: OnlineMatch = {
    matchId: myMatchId,
    playerXUid: uid,
    playerXNumericUid: profile.numericUid || 1,
    playerXName: profile.displayName || 'Player X',
    playerOUid: '',
    playerOName: 'Searching...',
    board: Array(9).fill(null),
    currentTurn: 'X',
    status: 'waiting_quick',
    isQuickMatch: true,
    queuedAt: myQueuedAt,
    winner: null,
    round: 1,
    restartRequests: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(myMatchRef, waitingMatch);

  // Step 3: Listen to our own match doc for an opponent claiming us
  unsubMyMatch = onSnapshot(
    myMatchRef,
    (snap) => {
      if (hasMatched || isCancelled || !snap.exists()) return;
      const data = snap.data() as OnlineMatch;
      if (data.status === 'active' && data.playerOUid && myMatchId) {
        finishMatch(myMatchId, 'X');
      }
    },
    (err) => {
      console.warn('My matchmaking doc listener notice:', err.message);
    }
  );

  // Step 4: Pair cleanly even if 2 players clicked Quick Match at the EXACT same millisecond
  const tryPairWhileWaiting = async () => {
    if (hasMatched || isCancelled || isPairing || !myMatchRef) return;
    isPairing = true;
    try {
      const snap = await getDocs(waitingQuery);
      const now = Date.now();
      const others: { id: string; queuedAt: number; playerXUid: string }[] = [];

      snap.forEach((d) => {
        if (d.id === myMatchId) return;
        const data = d.data() as OnlineMatch;
        if (!data.playerXUid || data.playerXUid === uid || data.playerOUid) return;
        const age = now - Number(data.queuedAt || 0);
        if (age >= -15000 && age < STALE_WINDOW_MS) {
          others.push({
            id: d.id,
            queuedAt: Number(data.queuedAt || 0),
            playerXUid: data.playerXUid
          });
        }
      });

      others.sort((a, b) => a.queuedAt - b.queuedAt);

      for (const other of others) {
        if (hasMatched || isCancelled) break;

        // Deterministic tie-breaker prevents simultaneous-click deadlocks:
        // Higher UID claims immediately; lower UID also claims after 2.5s fallback if higher hasn't claimed yet.
        const waitedLongEnough = now - myQueuedAt > 2500;
        const shouldClaim = uid > other.playerXUid || waitedLongEnough;
        if (!shouldClaim) continue;

        const candRef = doc(db, 'matches', other.id);
        const currentMyRef = myMatchRef;

        try {
          const paired = await runTransaction(db, async (tx) => {
            const [mySnap, theirSnap] = await Promise.all([tx.get(currentMyRef), tx.get(candRef)]);
            if (!mySnap.exists() || !theirSnap.exists()) return false;

            const mine = mySnap.data() as OnlineMatch;
            const theirs = theirSnap.data() as OnlineMatch;

            // If someone ALREADY joined my match, abort so mySnapshot handles it
            if (mine.status !== 'waiting_quick' || mine.playerOUid) return false;
            if (theirs.status !== 'waiting_quick' || theirs.playerOUid) return false;
            if (Date.now() - Number(theirs.queuedAt || 0) >= STALE_WINDOW_MS) return false;

            // Atomically cancel my waiting ticket and join theirs as Player O
            tx.delete(currentMyRef);
            tx.update(candRef, {
              playerOUid: uid,
              playerONumericUid: profile.numericUid || 1,
              playerOName: profile.displayName || 'Player O',
              status: 'active',
              updatedAt: serverTimestamp()
            });
            return true;
          });

          if (paired) {
            finishMatch(other.id, 'O');
            return;
          }
        } catch {
          // Concurrent modification - retry on next tick or snapshot
        }
      }
    } catch (e) {
      console.warn('Pairing attempt notice:', e);
    } finally {
      isPairing = false;
    }
  };

  unsubWaiting = onSnapshot(
    waitingQuery,
    () => {
      if (!hasMatched && !isCancelled) {
        tryPairWhileWaiting();
      }
    },
    (err) => {
      console.warn('Waiting queue listener notice:', err.message);
    }
  );

  // Heartbeat keeps our waiting ticket fresh while searching
  heartbeatTimer = setInterval(() => {
    if (hasMatched || isCancelled || !myMatchRef) return;
    updateDoc(myMatchRef, {
      queuedAt: Date.now(),
      updatedAt: serverTimestamp()
    }).catch(() => {});
  }, 10000);

  // Fallback periodic pairing check
  pollingTimer = setInterval(() => {
    if (!hasMatched && !isCancelled) {
      tryPairWhileWaiting();
    }
  }, 1500);

  return {
    cancel: async () => {
      isCancelled = true;
      cleanupListeners();
      if (!hasMatched) {
        await deleteMyWaitingDoc();
      }
    }
  };
}

/**
 * PRIVATE ROOM SYSTEM:
 * Enforces strictly 2 players max per room!
 * If a 3rd player attempts to join -> throws "Room Slots Are Full! (2/2 Players Already Joined)".
 * If either player exits -> room is deleted/abandoned immediately for both players.
 */
export async function createPrivateRoom(profile: UserProfile): Promise<{ matchId: string; roomCode: string }> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const matchRef = doc(collection(db, 'matches'));
  const matchId = matchRef.id;

  const roomRef = doc(db, 'rooms', roomCode);

  const matchData: OnlineMatch = {
    matchId,
    roomCode,
    playerXUid: uid,
    playerXNumericUid: profile.numericUid || 1,
    playerXName: profile.displayName || 'Player X',
    playerOUid: '',
    playerOName: 'Waiting for friend...',
    board: Array(9).fill(null),
    currentTurn: 'X',
    status: 'waiting',
    winner: null,
    round: 1,
    restartRequests: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(matchRef, matchData);

  try {
    await setDoc(roomRef, {
      matchId,
      roomCode,
      hostUid: uid,
      status: 'waiting',
      playersCount: 1,
      createdAt: serverTimestamp()
    });
  } catch {
    // fallback to match doc lookup
  }

  return { matchId, roomCode };
}

export async function joinPrivateRoom(roomCode: string, profile: UserProfile): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const cleanCode = roomCode.trim().toUpperCase();

  let targetMatchId: string | null = null;

  try {
    const roomRef = doc(db, 'rooms', cleanCode);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      targetMatchId = roomSnap.data().matchId;
    }
  } catch {
    // fallback
  }

  if (!targetMatchId) {
    const q = query(
      collection(db, 'matches'),
      where('roomCode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      targetMatchId = snap.docs[0].id;
    }
  }

  if (!targetMatchId) {
    throw new Error('Room not found. Check the 6-digit code or create a new room.');
  }

  const matchRef = doc(db, 'matches', targetMatchId);
  const roomRef = doc(db, 'rooms', cleanCode);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error('Match room has expired or ended.');
    const match = snap.data() as OnlineMatch;

    if (match.status === 'abandoned') {
      throw new Error('This room has been closed because a player exited.');
    }

    if (match.playerXUid === uid) {
      // Re-joining own room as host
      return;
    }

    // STRICT 2-PLAYER CHECK:
    if (match.playerOUid && match.playerOUid !== uid) {
      throw new Error('Room Slots Are Full! (2/2 Players Already Joined)');
    }

    tx.update(matchRef, {
      playerOUid: uid,
      playerONumericUid: profile.numericUid || 1,
      playerOName: profile.displayName || 'Player O',
      status: 'active',
      updatedAt: serverTimestamp()
    });

    try {
      tx.update(roomRef, {
        status: 'active',
        playersCount: 2,
        updatedAt: serverTimestamp()
      });
    } catch {
      // ignore
    }
  });

  return targetMatchId;
}

/**
 * DIRECT CHALLENGES (Bidirectional):
 * Both Challenger (X) and Acceptor (O) enter the exact same match automatically!
 */
export async function sendDirectChallenge(targetUid: string, profile: UserProfile): Promise<string> {
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('Please sign in with an account to send challenges.');
  }
  const uid = auth.currentUser.uid;
  if (uid === targetUid) {
    throw new Error('You cannot challenge yourself.');
  }
  const challengeId = `CH_${uid}_${Date.now()}`;
  const challengeRef = doc(db, 'challenges', targetUid);

  await setDoc(challengeRef, {
    id: challengeId,
    senderUid: uid,
    senderNumericUid: profile.numericUid || 1,
    senderName: profile.displayName || 'Player',
    senderAvatarEmoji: profile.avatarEmoji || '🤖',
    targetUid,
    status: 'pending',
    matchId: null,
    createdAt: Date.now(),
    timestamp: serverTimestamp()
  });

  return challengeId;
}

export function listenToIncomingChallenges(
  myUid: string,
  onChallenge: (challenge: DirectChallenge | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const challengeRef = doc(db, 'challenges', myUid);
  return onSnapshot(
    challengeRef,
    (snap) => {
      if (!snap.exists()) {
        onChallenge(null);
        return;
      }
      const data = snap.data() as DirectChallenge;
      const age = Date.now() - Number(data.createdAt || 0);
      const isFresh = !data.createdAt || (age >= -30000 && age < 120000);
      if (data.status === 'pending' && data.senderUid !== myUid && isFresh) {
        onChallenge(data);
      } else {
        onChallenge(null);
      }
    },
    (err) => {
      console.warn('Challenges listener notice:', err.message);
      if (onError) onError(err);
      onChallenge(null);
    }
  );
}

/**
 * Challenger listens to `challenges/{targetUid}` so when the opponent accepts,
 * the challenger immediately enters the created match as Player X!
 */
export function listenToOutgoingChallenge(
  targetUid: string,
  challengeId: string,
  onAccepted: (matchId: string) => void,
  onDeclined: () => void,
  onError?: (err: any) => void
): Unsubscribe {
  const challengeRef = doc(db, 'challenges', targetUid);
  let settled = false;

  return onSnapshot(
    challengeRef,
    (snap) => {
      if (settled || !snap.exists()) return;
      const data = snap.data() as DirectChallenge;
      if (data.id !== challengeId) return;

      if (data.status === 'accepted' && data.matchId) {
        settled = true;
        onAccepted(data.matchId);
      } else if (data.status === 'rejected') {
        settled = true;
        onDeclined();
      }
    },
    (err) => {
      console.warn('Outgoing challenge listener notice:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function cancelOutgoingChallenge(targetUid: string, challengeId: string) {
  try {
    const challengeRef = doc(db, 'challenges', targetUid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(challengeRef);
      if (snap.exists() && snap.data().id === challengeId && snap.data().status === 'pending') {
        tx.update(challengeRef, {
          status: 'rejected',
          cancelledBySender: true,
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch {
    // ignore
  }
}

export async function acceptChallenge(challenge: DirectChallenge, myProfile: UserProfile): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const challengeRef = doc(db, 'challenges', uid);
  const matchRef = doc(collection(db, 'matches'));
  const matchId = matchRef.id;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(challengeRef);
    if (!snap.exists() || snap.data().id !== challenge.id || snap.data().status !== 'pending') {
      throw new Error('This challenge has expired or was cancelled.');
    }

    tx.set(matchRef, {
      matchId,
      playerXUid: challenge.senderUid,
      playerXNumericUid: challenge.senderNumericUid || 1,
      playerXName: challenge.senderName || 'Player X',
      playerOUid: uid,
      playerONumericUid: myProfile.numericUid || 1,
      playerOName: myProfile.displayName || 'Player O',
      board: Array(9).fill(null),
      currentTurn: 'X',
      status: 'active',
      winner: null,
      round: 1,
      restartRequests: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    tx.update(challengeRef, {
      status: 'accepted',
      matchId,
      acceptedAt: serverTimestamp()
    });
  });

  return matchId;
}

export async function declineChallenge(myUid: string) {
  const challengeRef = doc(db, 'challenges', myUid);
  try {
    await updateDoc(challengeRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp()
    });
  } catch {
    // ignore
  }
}

/**
 * ONLINE MATCH LISTENER & ACTIONS
 */
export function listenToMatch(
  matchId: string,
  onUpdate: (match: OnlineMatch | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(
    matchRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(snap.data() as OnlineMatch);
    },
    (err) => {
      console.warn('Match listener notice:', err.message);
      if (onError) onError(err);
      onUpdate(null);
    }
  );
}

export interface LiveMatchUpdate {
  board: Board;
  currentTurn: Player;
  status: 'active' | 'completed' | 'abandoned';
  winner: Player | 'draw' | null;
  winningLine: number[];
  round: number;
  exitedBy?: string;
  reason?: string;
  updatedAt?: number;
}

/**
 * Ultra-low-latency WebSocket listener via RTDB (~40-90ms) for instant board moves & match cuts
 */
export function listenToLiveMatchMoves(
  matchId: string,
  onLiveUpdate: (update: LiveMatchUpdate) => void
): Unsubscribe {
  const liveRef = ref(rtdb, `/match_live/${matchId}`);
  return onValue(
    liveRef,
    (snap) => {
      const val = snap.val();
      if (!val || typeof val !== 'object') return;

      // RTDB strips null entries in sparse arrays — reconstruct clean 9-cell Board safely
      const normalizedBoard: Board = Array(9).fill(null);
      if (val.board && typeof val.board === 'object') {
        for (let i = 0; i < 9; i++) {
          const cell = val.board[i];
          if (cell === 'X' || cell === 'O') {
            normalizedBoard[i] = cell;
          }
        }
      }

      onLiveUpdate({
        board: normalizedBoard,
        currentTurn: val.currentTurn === 'O' ? 'O' : 'X',
        status: val.status || 'active',
        winner: val.winner ?? null,
        winningLine: Array.isArray(val.winningLine) ? val.winningLine : [],
        round: Number(val.round || 1),
        exitedBy: val.exitedBy,
        reason: val.reason,
        updatedAt: Number(val.updatedAt || 0)
      });
    },
    () => {
      // Silently fall back to Firestore listener if RTDB path is restricted
    }
  );
}

/**
 * Real-time per-match presence & instant opponent offline detector.
 * Detects app close, network loss, tab switch (>6s), or RTDB socket disconnect immediately.
 */
export function setupMatchPresenceAndWatchOpponent(
  matchId: string,
  myUid: string,
  opponentUid: string,
  onOpponentOffline: () => void
): Unsubscribe {
  if (!matchId || !myUid || !opponentUid) return () => {};

  const myPresRef = ref(rtdb, `/match_presence/${matchId}/${myUid}`);
  const oppPresRef = ref(rtdb, `/match_presence/${matchId}/${opponentUid}`);
  const oppStatusRef = ref(rtdb, `/status/${opponentUid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  let cleanedUp = false;
  let triggeredOffline = false;
  let opponentSeenOnline = false;
  let lastOppHeartbeatAt = Date.now();
  const startedAt = Date.now();
  let hiddenTimer: ReturnType<typeof setTimeout> | null = null;

  const fireOpponentOffline = () => {
    if (cleanedUp || triggeredOffline) return;
    triggeredOffline = true;
    onOpponentOffline();
  };

  const publishMyOnline = () => {
    if (cleanedUp) return;
    set(myPresRef, {
      online: true,
      lastSeen: Date.now()
    }).catch(() => {});
  };

  const publishMyOffline = () => {
    set(myPresRef, {
      online: false,
      disconnectedAt: Date.now()
    }).catch(() => {});
  };

  const unsubConnected = onValue(connectedRef, async (snap) => {
    if (cleanedUp) return;
    if (snap.val() === true) {
      try {
        await onDisconnect(myPresRef).set({
          online: false,
          disconnectedAt: rtdbServerTimestamp()
        });
        publishMyOnline();
      } catch {
        // ignore
      }
    }
  });

  // Watch opponent's dedicated match presence node
  const unsubOppPres = onValue(
    oppPresRef,
    (snap) => {
      if (cleanedUp) return;
      const val = snap.val();
      if (!val) return;
      if (val.online === true) {
        opponentSeenOnline = true;
        lastOppHeartbeatAt = Date.now();
      } else if (val.online === false) {
        const discAt = Number(val.disconnectedAt || 0);
        if (opponentSeenOnline || discAt >= startedAt - 5000) {
          fireOpponentOffline();
        }
      }
    },
    () => {}
  );

  // Also watch opponent's global online status node for immediate offline drops
  const unsubOppStatus = onValue(
    oppStatusRef,
    (snap) => {
      if (cleanedUp) return;
      const val = snap.val();
      if (!val) return;
      if (val.isOnline === true) {
        opponentSeenOnline = true;
        lastOppHeartbeatAt = Date.now();
      } else if (val.isOnline === false) {
        const updAt = Number(val.updatedAt || val.lastSeen || 0);
        if (opponentSeenOnline || updAt >= startedAt - 5000) {
          fireOpponentOffline();
        }
      }
    },
    () => {}
  );

  // Fast 3-second heartbeat + watchdog for abrupt network drops (e.g. Airplane Mode / Wi-Fi off)
  const heartbeatInterval = setInterval(() => {
    if (cleanedUp) return;
    if (typeof document === 'undefined' || !document.hidden) {
      publishMyOnline();
    }
    const now = Date.now();
    // If opponent was active and stopped heartbeating for > 10s, or never appeared after 14s
    if (opponentSeenOnline && now - lastOppHeartbeatAt > 10000) {
      fireOpponentOffline();
    } else if (!opponentSeenOnline && now - startedAt > 14000 && now - lastOppHeartbeatAt > 12000) {
      fireOpponentOffline();
    }
  }, 3000);

  const handlePageHide = () => {
    publishMyOffline();
  };

  const handleVisibility = () => {
    if (cleanedUp) return;
    if (document.hidden) {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      // If player leaves app/switches away for > 6 seconds, mark offline so opponent isn't stuck
      hiddenTimer = setTimeout(() => {
        if (!cleanedUp && document.hidden) {
          publishMyOffline();
        }
      }, 6000);
    } else {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
      publishMyOnline();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
  }

  return () => {
    cleanedUp = true;
    clearInterval(heartbeatInterval);
    if (hiddenTimer) clearTimeout(hiddenTimer);
    unsubConnected();
    unsubOppPres();
    unsubOppStatus();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };
}

/**
 * FAST ONLINE MOVE:
 * 1) Pushes instantly over persistent RTDB WebSocket (~40-90ms to opponent!)
 * 2) Persists in a single Firestore updateDoc round-trip (eliminates slow 2-step runTransaction lag!)
 */
export async function makeOnlineMove(
  matchId: string,
  cellIndex: number,
  playerSymbol: Player,
  currentBoard?: Board,
  currentRound: number = 1
) {
  const matchRef = doc(db, 'matches', matchId);

  if (Array.isArray(currentBoard) && currentBoard.length === 9) {
    if (currentBoard[cellIndex] !== null) return false;

    const newBoard = [...currentBoard];
    newBoard[cellIndex] = playerSymbol;

    const outcome = checkWinner(newBoard);
    const isOver = outcome !== null;
    const nextTurn: Player = playerSymbol === 'X' ? 'O' : 'X';
    const nextStatus = isOver ? 'completed' : 'active';
    const winningLine = outcome ? outcome.line : [];

    // Encode board with explicit empty markers for RTDB (RTDB strips null array elements)
    const rtdbBoard = newBoard.map((c) => c ?? '');

    // Fire instant RTDB WebSocket relay in parallel with single-trip Firestore write
    const rtdbPromise = set(ref(rtdb, `/match_live/${matchId}`), {
      board: rtdbBoard,
      currentTurn: nextTurn,
      status: nextStatus,
      winner: outcome ? outcome.winner : null,
      winningLine,
      round: currentRound,
      updatedAt: Date.now()
    }).catch(() => {});

    const firestorePromise = updateDoc(matchRef, {
      board: newBoard,
      currentTurn: nextTurn,
      status: nextStatus,
      winner: outcome ? outcome.winner : null,
      winningLine,
      updatedAt: serverTimestamp()
    });

    await Promise.all([rtdbPromise, firestorePromise]);
    return true;
  }

  // Fallback transaction path if board wasn't provided
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) return false;
    const match = snap.data() as OnlineMatch;

    if (match.status !== 'active') return false;
    if (match.currentTurn !== playerSymbol) return false;
    if (match.board[cellIndex] !== null) return false;

    const newBoard = [...match.board];
    newBoard[cellIndex] = playerSymbol;

    const outcome = checkWinner(newBoard);
    const isOver = outcome !== null;

    tx.update(matchRef, {
      board: newBoard,
      currentTurn: playerSymbol === 'X' ? 'O' : 'X',
      status: isOver ? 'completed' : 'active',
      winner: outcome ? outcome.winner : null,
      winningLine: outcome ? outcome.line : [],
      updatedAt: serverTimestamp()
    });
    return true;
  });
}

export async function requestMatchRestart(matchId: string, uid: string) {
  const matchRef = doc(db, 'matches', matchId);
  let restartedRound: number | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) return;
    const match = snap.data() as OnlineMatch;

    const reqs = Array.isArray(match.restartRequests) ? [...match.restartRequests] : [];
    if (!reqs.includes(uid)) reqs.push(uid);

    const bothReady = reqs.includes(match.playerXUid) && reqs.includes(match.playerOUid);
    if (bothReady) {
      restartedRound = (match.round || 1) + 1;
      tx.update(matchRef, {
        board: Array(9).fill(null),
        currentTurn: 'X',
        status: 'active',
        winner: null,
        winningLine: [],
        restartRequests: [],
        round: restartedRound,
        restartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      tx.update(matchRef, {
        restartRequests: reqs,
        updatedAt: serverTimestamp()
      });
    }
  });

  if (restartedRound !== null) {
    set(ref(rtdb, `/match_live/${matchId}`), {
      board: Array(9).fill(''),
      currentTurn: 'X',
      status: 'active',
      winner: null,
      winningLine: [],
      round: restartedRound,
      updatedAt: Date.now()
    }).catch(() => {});
  }
}

/**
 * Auto-delete all match chat messages when match ends or players exit
 */
export async function deleteMatchChat(matchId: string) {
  try {
    const chatColl = collection(db, `matches/${matchId}/messages`);
    const snap = await getDocs(chatColl);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch {
    // ignore
  }
}

/**
 * When either player exits or goes offline, notify immediately via RTDB (~50ms)
 * AND abandon the Firestore match & room, wiping chat clean!
 */
export async function exitOnlineMatch(matchId: string, uid: string, reason: 'left' | 'offline' = 'left') {
  // Instant RTDB cut signal so the other player exits immediately
  set(ref(rtdb, `/match_live/${matchId}`), {
    status: 'abandoned',
    exitedBy: uid,
    reason,
    updatedAt: Date.now()
  }).catch(() => {});

  set(ref(rtdb, `/match_presence/${matchId}/${uid}`), {
    online: false,
    disconnectedAt: Date.now()
  }).catch(() => {});

  const matchRef = doc(db, 'matches', matchId);
  try {
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.roomCode) {
        deleteDoc(doc(db, 'rooms', data.roomCode)).catch(() => {});
      }
    }
    await updateDoc(matchRef, {
      status: 'abandoned',
      exitedBy: uid,
      exitReason: reason,
      endedAt: serverTimestamp()
    });
  } catch {
    // ignore
  }
  await deleteMatchChat(matchId);
}

/**
 * CHAT SYSTEM
 */
export function listenToChat(
  matchId: string,
  onMessages: (messages: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const chatColl = collection(db, `matches/${matchId}/messages`);
  const q = query(chatColl, orderBy('timestamp', 'asc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      onMessages(msgs);
    },
    (err) => {
      console.warn('Chat listener notice:', err.message);
      if (onError) onError(err);
      onMessages([]);
    }
  );
}

export async function sendChatMessage(matchId: string, text: string, senderUid: string, senderName: string) {
  const chatColl = collection(db, `matches/${matchId}/messages`);
  const msgDoc = doc(chatColl);
  await setDoc(msgDoc, {
    senderUid,
    senderName,
    text,
    timestamp: serverTimestamp()
  });
}

/**
 * LEADERBOARD
 * Strictly displays only real authenticated, registered user profiles.
 * Guests and mock accounts are completely excluded.
 */
export function listenToLeaderboard(
  onUpdate: (players: UserProfile[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const usersColl = collection(db, 'users');
  const q = query(usersColl, orderBy('level', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();

        // Strictly exclude guests, fake, and disabled profiles (never attempt cross-user deletes)
        if (
          data.displayName &&
          data.displayName.trim().length > 0 &&
          data.displayName !== 'PB Player' &&
          !data.isGuest &&
          !data.isFake &&
          !data.disabled
        ) {
          const totalXp = Number(data.xp || 0);
          const levelInfo = calculateLevelInfo(totalXp);

          list.push({
            uid: d.id,
            numericUid: Number(data.numericUid || 0),
            displayName: data.displayName,
            avatarUrl: data.avatarUrl || null,
            avatarEmoji: data.avatarEmoji || '🤖',
            isGuest: false,
            xp: totalXp,
            level: Math.max(levelInfo.level, Number(data.level || 1)),
            wins: Number(data.wins || 0),
            aiWins: Number(data.aiWins || 0),
            losses: Number(data.losses || 0),
            draws: Number(data.draws || 0),
            matches: Number(data.matches || 0),
            streak: Number(data.streak || 0),
            bestStreak: Number(data.bestStreak || 0),
            blockedUids: Array.isArray(data.blockedUids) ? data.blockedUids : []
          });
        }
      });

      // Deduplicate by UID
      const seenUids = new Set<string>();
      const unique = list.filter((item) => {
        if (seenUids.has(item.uid)) return false;
        seenUids.add(item.uid);
        return true;
      });

      // Sort by level desc, xp desc, wins desc
      unique.sort((a, b) => b.level - a.level || b.xp - a.xp || b.wins - a.wins);

      // Ensure every displayed entry has a clean unique numericUid
      const usedNumericUids = new Set<number>();
      unique.forEach((p) => {
        if (p.numericUid && p.numericUid >= 1 && !usedNumericUids.has(p.numericUid)) {
          usedNumericUids.add(p.numericUid);
        } else {
          let nextAvailable = 2;
          while (usedNumericUids.has(nextAvailable)) {
            nextAvailable++;
          }
          p.numericUid = nextAvailable;
          usedNumericUids.add(nextAvailable);
        }
      });

      // Strictly Top 10 Competitors
      onUpdate(unique.slice(0, 10));
    },
    (err) => {
      console.warn('Leaderboard listener notice:', err.message);
      if (onError) onError(err);
    }
  );
}

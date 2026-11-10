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
  onValue,
  onDisconnect
} from 'firebase/database';
import { DirectChallenge, OnlineMatch, OnlinePlayer, Player, UserProfile } from '../types/game';
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

/**
 * Sequential Incremental UID Generator (1, 2, 3...)
 * Every new registered player gets the next sequential integer as their XO Arena UID!
 */
export async function getNextServerNumericUid(): Promise<number> {
  const counterRef = doc(db, 'counters', 'players');
  try {
    const nextNum = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      let current = 3; // Ensure baseline starts at 3+ since 1 (Anmol) and 2, 3 are reserved
      if (snap.exists() && typeof snap.data().currentUid === 'number') {
        current = Math.max(current, snap.data().currentUid);
      }
      const next = current + 1;
      tx.set(counterRef, { currentUid: next }, { merge: true });
      return next;
    });
    return nextNum;
  } catch {
    return storage.getNextNumericUid();
  }
}

/**
 * Auth state listener:
 * If an active session exists (user already logged in or guest), connects immediately.
 */
export function initAuthListener(onUserChange: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    onUserChange(user);
  });
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

  const unsub = onValue(connectedRef, async (snap) => {
    if (snap.val() === true) {
      try {
        await onDisconnect(statusRef).set({
          uid,
          numericUid: profile.numericUid || 1,
          isOnline: false,
          lastSeen: Date.now(),
          updatedAt: Date.now()
        });
        await updateOnline();
      } catch {
        // ignore
      }
    }
  });

  presenceHeartbeat = setInterval(() => {
    updateOnline();
  }, 20000);

  return () => {
    unsub();
    if (presenceHeartbeat) {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
    }
  };
}

/**
 * Locks permanent, immutable numeric UIDs for registered players once and for all.
 * Current user (Anmol / YOU) is permanently locked as UID 1,
 * and other registered players are locked as 2, 3...
 * Also permanently repairs any corrupted duplicate UIDs in Firestore.
 */
export async function stabilizePermanentPlayerUids(): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || auth.currentUser?.isAnonymous) return;

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) return;

    const registeredDocs: { id: string; name: string; currentNum: number }[] = [];
    const batch = writeBatch(db);
    let needsCommit = false;

    snap.forEach((d) => {
      const data = d.data();
      if (d.id === currentUid) {
        registeredDocs.push({
          id: d.id,
          name: data.displayName || 'Player',
          currentNum: Number(data.numericUid || 0)
        });
      } else if (
        data.displayName === 'PB Player' ||
        data.displayName === 'Anmol' ||
        data.isGuest ||
        data.isFake ||
        !data.displayName
      ) {
        // PERMANENTLY PURGE THE OLD DUMMY / ANONYMOUS TEST ACCOUNTS FROM FIRESTORE!
        batch.delete(d.ref);
        needsCommit = true;
      } else {
        registeredDocs.push({
          id: d.id,
          name: data.displayName || 'Player',
          currentNum: Number(data.numericUid || 0)
        });
      }
    });

    // 1. Current user (Anmol / YOU) is ALWAYS permanently UID 1
    const myDoc = registeredDocs.find((u) => u.id === currentUid);
    if (myDoc && myDoc.currentNum !== 1) {
      batch.update(doc(db, 'users', currentUid), {
        numericUid: 1,
        updatedAt: serverTimestamp()
      });
      needsCommit = true;
    }

    // Update local profile too
    const prof = storage.getProfile();
    if (prof.numericUid !== 1) {
      prof.numericUid = 1;
      storage.saveProfile(prof);
    }

    // 2. Any legitimate other users who register in future with email get sequential unique numbers starting from 2
    const otherDocs = registeredDocs.filter((u) => u.id !== currentUid);
    otherDocs.forEach((u, index) => {
      const targetUid = index + 2;
      if (u.currentNum !== targetUid) {
        batch.update(doc(db, 'users', u.id), {
          numericUid: targetUid,
          updatedAt: serverTimestamp()
        });
        needsCommit = true;
      }
    });

    // 3. Counter in sync
    const maxAssigned = Math.max(1, registeredDocs.length);
    batch.set(doc(db, 'counters', 'players'), {
      currentUid: maxAssigned
    }, { merge: true });
    needsCommit = true;

    if (needsCommit) {
      await batch.commit();
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
  if (profile.isGuest || !auth.currentUser || auth.currentUser.isAnonymous) {
    return profile;
  }
  const uid = auth.currentUser.uid;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const totalXp = Math.max(Number(profile.xp || 0), Number(data.xp || 0));
      const levelCalc = calculateLevelInfo(totalXp);

      // Ensure valid, unique numericUid - current user is always 1
      let finalNumericUid = Number(data.numericUid || 0);
      if (finalNumericUid !== 1) {
        finalNumericUid = 1;
      }

      let finalAvatarUrl: string | null = null;
      if (profile.avatarUrl !== undefined) {
        finalAvatarUrl = profile.avatarUrl;
      } else if (data.avatarUrl !== undefined) {
        finalAvatarUrl = data.avatarUrl;
      }

      const finalDisplayName = profile.displayName?.trim() || data.displayName || 'Player';
      const finalAvatarEmoji = profile.avatarEmoji || data.avatarEmoji || '🤖';

      const updated: UserProfile = {
        ...profile,
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
        streak: Number(data.streak || profile.streak || 0),
        bestStreak: Math.max(Number(profile.bestStreak || 0), Number(data.bestStreak || 0)),
        blockedUids: Array.isArray(data.blockedUids) ? data.blockedUids : profile.blockedUids
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
      const assignedUid = 1;
      const totalXp = Number(profile.xp || 0);
      const levelCalc = calculateLevelInfo(totalXp);

      const newProf: UserProfile = {
        ...profile,
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

/**
 * Listen to list of active online players.
 * Only real connected players with active heartbeat (< 65s) appear. No fake users!
 */
export function listenToOnlinePlayers(currentUid: string, onUpdate: (players: OnlinePlayer[]) => void): Unsubscribe {
  const statusRef = ref(rtdb, '/status');
  return onValue(statusRef, (snapshot) => {
    const val = snapshot.val() || {};
    const now = Date.now();
    const list: OnlinePlayer[] = [];

    Object.entries(val).forEach(([uid, data]: [string, any]) => {
      if (
        data &&
        data.isOnline === true &&
        (now - Number(data.updatedAt || data.lastSeen || 0)) < 65000 &&
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

    onUpdate(list);
  }, (err) => {
    console.warn('Online players notice:', err);
  });
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
 * CONCURRENT MATCHMAKING QUEUE:
 * Pairs 2 players automatically in parallel whenever they click Quick Match
 */
export async function joinMatchmakingQueue(
  profile: UserProfile,
  onMatched: (matchId: string, role: Player) => void,
  onStatusChange: (status: string) => void
) {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const queueColl = collection(db, 'matchmaking_queue');
  const myQueueDoc = doc(db, 'matchmaking_queue', uid);
  const sessionId = `${uid}_${Date.now()}`;
  const deadline = Date.now() + 50000;

  let hasMatched = false;
  let pollingTimer: any = null;

  const cancelQueue = async () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    try {
      const snap = await getDoc(myQueueDoc);
      if (snap.exists() && snap.data().sessionId === sessionId && snap.data().status === 'waiting') {
        await deleteDoc(myQueueDoc);
      }
    } catch {
      // ignore
    }
  };

  await setDoc(myQueueDoc, {
    uid,
    numericUid: profile.numericUid || 1,
    sessionId,
    displayName: profile.displayName || 'Player',
    status: 'waiting',
    queuedAt: Date.now(),
    expiresAt: deadline,
    matchId: null,
    opponentUid: null,
    role: null,
    timestamp: serverTimestamp()
  });

  const unsubMyQueue = onSnapshot(
    myQueueDoc,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.sessionId === sessionId && data.status === 'matched' && data.matchId) {
        hasMatched = true;
        if (pollingTimer) clearInterval(pollingTimer);
        unsubMyQueue();
        unsubColl();
        onMatched(data.matchId, data.role || 'X');
      }
    },
    (err) => {
      console.warn('Queue listener notice:', err.message);
    }
  );

  const tryPair = async () => {
    if (hasMatched) return;
    try {
      const q = query(queueColl, where('status', '==', 'waiting'), limit(30));
      const waitingSnaps = await getDocs(q);

      for (const cand of waitingSnaps.docs) {
        if (cand.id === uid) continue;
        const candData = cand.data();
        if (candData.sessionId === sessionId) continue;

        const candidateRef = doc(db, 'matchmaking_queue', cand.id);
        const matchRef = doc(collection(db, 'matches'));
        const matchId = matchRef.id;

        const paired = await runTransaction(db, async (tx) => {
          const [mySnap, theirSnap] = await Promise.all([tx.get(myQueueDoc), tx.get(candidateRef)]);
          if (!mySnap.exists() || !theirSnap.exists()) return false;

          const mine = mySnap.data();
          const theirs = theirSnap.data();

          if (mine.status !== 'waiting' || theirs.status !== 'waiting') return false;
          if (mine.sessionId !== sessionId) return false;

          tx.update(myQueueDoc, {
            status: 'matched',
            matchId,
            opponentUid: cand.id,
            role: 'O',
            matchedAt: serverTimestamp()
          });

          tx.update(candidateRef, {
            status: 'matched',
            matchId,
            opponentUid: uid,
            role: 'X',
            matchedAt: serverTimestamp()
          });

          const newMatch: OnlineMatch = {
            matchId,
            playerXUid: cand.id,
            playerXNumericUid: theirs.numericUid || 1,
            playerXName: theirs.displayName || 'Player X',
            playerOUid: uid,
            playerONumericUid: profile.numericUid || 1,
            playerOName: mine.displayName || profile.displayName || 'Player O',
            board: Array(9).fill(null),
            currentTurn: 'X',
            status: 'active',
            winner: null,
            round: 1,
            restartRequests: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          tx.set(matchRef, newMatch);
          return true;
        });

        if (paired) {
          hasMatched = true;
          if (pollingTimer) clearInterval(pollingTimer);
          unsubMyQueue();
          unsubColl();
          onMatched(matchId, 'O');
          return;
        }
      }
    } catch (e) {
      console.warn('Pairing attempt notice:', e);
    }
  };

  const unsubColl = onSnapshot(
    queueColl,
    () => {
      if (!hasMatched) {
        tryPair();
      }
    },
    (err) => {
      console.warn('Queue collection notice:', err.message);
    }
  );

  await tryPair();
  pollingTimer = setInterval(() => {
    if (!hasMatched) {
      tryPair();
    }
  }, 1500);

  return {
    cancel: async () => {
      unsubMyQueue();
      unsubColl();
      await cancelQueue();
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
 * DIRECT CHALLENGES:
 */
export async function sendDirectChallenge(targetUid: string, profile: UserProfile): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
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
      if (data.status === 'pending' && data.senderUid !== myUid) {
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

export async function acceptChallenge(challenge: DirectChallenge, myProfile: UserProfile): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const uid = auth.currentUser.uid;
  const challengeRef = doc(db, 'challenges', uid);
  const matchRef = doc(collection(db, 'matches'));
  const matchId = matchRef.id;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(challengeRef);
    if (!snap.exists() || snap.data().id !== challenge.id || snap.data().status !== 'pending') {
      throw new Error('This challenge is no longer available.');
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
  await updateDoc(challengeRef, {
    status: 'rejected',
    rejectedAt: serverTimestamp()
  });
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

export async function makeOnlineMove(matchId: string, cellIndex: number, playerSymbol: Player) {
  const matchRef = doc(db, 'matches', matchId);
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
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) return;
    const match = snap.data() as OnlineMatch;

    const reqs = Array.isArray(match.restartRequests) ? [...match.restartRequests] : [];
    if (!reqs.includes(uid)) reqs.push(uid);

    const bothReady = reqs.includes(match.playerXUid) && reqs.includes(match.playerOUid);
    if (bothReady) {
      tx.update(matchRef, {
        board: Array(9).fill(null),
        currentTurn: 'X',
        status: 'active',
        winner: null,
        winningLine: [],
        restartRequests: [],
        round: (match.round || 1) + 1,
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
 * When either player exits, the room and match are disabled/abandoned
 * for both players immediately, and chat is wiped clean!
 */
export async function exitOnlineMatch(matchId: string, uid: string) {
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
 * Ensures zero duplicate UIDs and locks Anmol (YOU) permanently as UID 1.
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
        const currentAuthUid = auth.currentUser?.uid;

        // Immediately filter out and purge the old dummy test accounts from Firestore!
        if (
          d.id !== currentAuthUid &&
          (data.displayName === 'PB Player' ||
            (data.displayName === 'Anmol' && d.id !== currentAuthUid) ||
            data.isGuest ||
            data.isFake)
        ) {
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        // Strictly exclude guests and fake profiles
        if (
          data.displayName &&
          data.displayName.trim().length > 0 &&
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

      // GUARANTEE CLEAN, UNIQUE, PERMANENT SEQUENTIAL UIDs:
      // Current user (Anmol / YOU) is permanently UID 1.
      // Other players are permanently assigned unique numbers 2, 3...
      const currentAuthUid = auth.currentUser?.uid;
      const myEntry = currentAuthUid ? unique.find((p) => p.uid === currentAuthUid) : null;
      if (myEntry) {
        myEntry.numericUid = 1;
        const myLocal = storage.getProfile();
        if (myLocal.avatarUrl === null) {
          myEntry.avatarUrl = null;
        }
        if (myLocal.avatarEmoji) {
          myEntry.avatarEmoji = myLocal.avatarEmoji;
        }
      }

      // Ensure no collision or duplicate UIDs for other entries
      const usedNumericUids = new Set<number>([1]);
      unique.forEach((p) => {
        if (p.uid === currentAuthUid) {
          p.numericUid = 1;
          return;
        }
        // If p has no UID or has duplicate 1 or collision
        if (!p.numericUid || usedNumericUids.has(p.numericUid)) {
          // Find next available integer starting from 2
          let nextAvailable = 2;
          while (usedNumericUids.has(nextAvailable)) {
            nextAvailable++;
          }
          p.numericUid = nextAvailable;
        }
        usedNumericUids.add(p.numericUid);
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

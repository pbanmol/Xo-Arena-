import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIDifficulty,
  AppTheme,
  Board,
  ChatMessage,
  DirectChallenge,
  GameMode,
  MatchRecord,
  OnlinePlayer,
  Player,
  TabScreen,
  UserProfile
} from './types/game';
import { storage, calculateLevelInfo } from './services/storage';
import { sound } from './services/sound';
import { haptics } from './services/haptics';
import { applySystemBarsTheme } from './services/systemBars';
import { checkWinner, getAIMove } from './services/ai';
import {
  acceptChallenge,
  cancelOutgoingChallenge,
  createPrivateRoom,
  declineChallenge,
  exitOnlineMatch,
  fetchOnlinePlayersOnce,
  initAuthListener,
  joinMatchmakingQueue,
  joinPrivateRoom,
  listenToChat,
  listenToIncomingChallenges,
  listenToLeaderboard,
  listenToLiveMatchMoves,
  listenToMatch,
  listenToOnlinePlayers,
  listenToOutgoingChallenge,
  loginWithEmail,
  logOut,
  makeOnlineMove,
  registerWithEmail,
  requestMatchRestart,
  sendChatMessage,
  sendDirectChallenge,
  setupMatchPresenceAndWatchOpponent,
  setupPresence,
  syncUserProfile,
  stabilizePermanentPlayerUids
} from './services/firebase';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { GameArena } from './components/GameArena';
import { OnlineLobby } from './components/OnlineLobby';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ResultModal } from './components/ResultModal';
import { ChallengeModal } from './components/ChallengeModal';
import { LocalSetupModal } from './components/LocalSetupModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer, ToastItem } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  // Initial App Startup Splash & Entry Gate
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [hasChosenEntryMode, setHasChosenEntryMode] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<TabScreen>('home');

  // Settings & Theme (Default: Crimson Red, White/Light Mode)
  const [theme, setTheme] = useState<AppTheme>(() => storage.get('theme', 'crimson'));
  const [isDark, setIsDark] = useState<boolean>(() => storage.get('dark_mode', false));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => storage.get('sound', true));
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => storage.get('haptics', true));

  // User Profile & Auth
  const [profile, setProfile] = useState<UserProfile>(() => storage.getProfile());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Lists
  const [history, setHistory] = useState<MatchRecord[]>(() => storage.getHistory());
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => storage.getAchievements());
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Game Engine State
  const [gameMode, setGameMode] = useState<GameMode>('computer');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('classic');
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<Player>('X');
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [moveHistory, setMoveHistory] = useState<{ index: number; player: Player }[]>([]);
  const [playerNames, setPlayerNames] = useState<{ X: string; O: string }>({
    X: 'Player X',
    O: 'XO Bot'
  });
  const [scores, setScores] = useState<{ X: number; O: number; draws: number }>({
    X: 0,
    O: 0,
    draws: 0
  });

  // Online Multiplayer State
  const [activeOnlineMatchId, setActiveOnlineMatchId] = useState<string | null>(null);
  const [myOnlineSymbol, setMyOnlineSymbol] = useState<Player | undefined>(undefined);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | undefined>(undefined);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingTime, setMatchmakingTime] = useState(0);
  const matchmakingCancelRef = useRef<(() => Promise<void>) | null>(null);
  const matchmakingTimerRef = useRef<any>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [restartRequestedByMe, setRestartRequestedByMe] = useState(false);
  const [hasRulesPermissionNotice, setHasRulesPermissionNotice] = useState(false);
  const [outgoingChallenge, setOutgoingChallenge] = useState<{
    id: string;
    targetUid: string;
    targetName: string;
  } | null>(null);

  // Refs to prevent listener leaks, stale closures, and duplicate round endings
  const outgoingChallengeUnsubRef = useRef<(() => void) | null>(null);
  const outgoingChallengeTimerRef = useRef<any>(null);
  const privateRoomWaiterRef = useRef<(() => void) | null>(null);
  const pendingRoomMatchIdRef = useRef<string | null>(null);
  const completedRoundKeyRef = useRef<string | null>(null);
  const prevOnlinePiecesRef = useRef<number>(0);
  const onlineRoundRef = useRef<number>(1);
  const onlineNamesRef = useRef<{ X: string; O: string }>({ X: 'Player X', O: 'Player O' });
  const onlineOpponentUidRef = useRef<string | null>(null);
  const onlinePresenceUnsubRef = useRef<(() => void) | null>(null);
  const onlineMatchCutRef = useRef<boolean>(false);
  const moveInFlightRef = useRef<boolean>(false);
  const aiMoveTimerRef = useRef<any>(null);
  const lastIncomingChallengeIdRef = useRef<string | null>(null);
  const profileRef = useRef<UserProfile>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Modals
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    outcome: 'win' | 'loss' | 'draw' | null;
    winnerName?: string;
    earnedXP: number;
  }>({
    isOpen: false,
    outcome: null,
    earnedXP: 0
  });
  const [incomingChallenge, setIncomingChallenge] = useState<DirectChallenge | null>(null);
  const [localSetupOpen, setLocalSetupOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper: Toast
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync theme, dark mode, and Android/iPhone system status & navigation bar colors automatically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-dark', isDark ? 'true' : 'false');
    storage.set('theme', theme);
    storage.set('dark_mode', isDark);
    applySystemBarsTheme(theme, isDark);
  }, [theme, isDark]);

  useEffect(() => {
    sound.enabled = soundEnabled;
    storage.set('sound', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    haptics.enabled = hapticsEnabled;
    storage.set('haptics', hapticsEnabled);
  }, [hapticsEnabled]);

  // Cleanup active matchmaking / challenge / room waiters on unmount
  useEffect(() => {
    return () => {
      if (matchmakingTimerRef.current) clearInterval(matchmakingTimerRef.current);
      if (matchmakingCancelRef.current) matchmakingCancelRef.current().catch(() => {});
      if (outgoingChallengeUnsubRef.current) outgoingChallengeUnsubRef.current();
      if (outgoingChallengeTimerRef.current) clearTimeout(outgoingChallengeTimerRef.current);
      if (privateRoomWaiterRef.current) privateRoomWaiterRef.current();
      if (aiMoveTimerRef.current) clearTimeout(aiMoveTimerRef.current);
    };
  }, []);

  // Auth & Presence Initialization
  useEffect(() => {
    let presenceCleanup: any = null;
    const authTimeout = setTimeout(() => {
      setAuthReady(true);
    }, 1500);

    let unsubAuth: () => void = () => {};
    try {
      unsubAuth = initAuthListener(async (user) => {
        clearTimeout(authTimeout);
        setCurrentUser(user);
        setAuthReady(true);
        if (user) {
          if (!user.isAnonymous) {
            setHasChosenEntryMode(true);
          }
          try {
            // Lock permanent, immutable UIDs once and for all (PBX is permanently UID 1)
            await stabilizePermanentPlayerUids();

            // Load user profile & sync with Firestore
            const savedProf = storage.getProfile(user.uid);
            const synced = await syncUserProfile({
              ...savedProf,
              uid: user.uid,
              isGuest: Boolean(user.isAnonymous),
              displayName: user.displayName || savedProf.displayName
            });
            setProfile(synced);
            storage.saveProfile(synced);

            // Setup RTDB Presence
            presenceCleanup = setupPresence(user, synced);
          } catch (err) {
            console.warn('Auth profile sync notice:', err);
          }
        }
      });
    } catch {
      clearTimeout(authTimeout);
      setAuthReady(true);
    }

    return () => {
      clearTimeout(authTimeout);
      unsubAuth();
      if (presenceCleanup) presenceCleanup();
    };
  }, []);

  // Global Leaderboard Listener (Active for all users & guests)
  useEffect(() => {
    const unsubLeaderboard = listenToLeaderboard(
      (ranks) => {
        setLeaderboard(ranks);
      },
      (err) => {
        if (err?.code === 'permission-denied') {
          setHasRulesPermissionNotice(true);
        }
      }
    );
    return () => unsubLeaderboard();
  }, []);

  // Listeners for Online Lobby (Registered Players Only)
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous || profile.isGuest) {
      setOnlinePlayers([]);
      setIncomingChallenge(null);
      return;
    }

    // Online players
    const unsubPlayers = listenToOnlinePlayers(currentUser.uid, (players) => {
      setOnlinePlayers(players);
    });

    // Incoming challenges
    const unsubChallenges = listenToIncomingChallenges(
      currentUser.uid,
      (challenge) => {
        if (challenge) {
          // Check if sender is blocked
          if ((profile.blockedUids || []).includes(challenge.senderUid)) {
            declineChallenge(currentUser.uid);
            return;
          }
          if (lastIncomingChallengeIdRef.current !== challenge.id) {
            lastIncomingChallengeIdRef.current = challenge.id;
            sound.playChallengeReceived();
            haptics.trigger([40, 60, 40]);
          }
          setIncomingChallenge(challenge);
        } else {
          lastIncomingChallengeIdRef.current = null;
          setIncomingChallenge(null);
        }
      },
      (err) => {
        if (err?.code === 'permission-denied') {
          setHasRulesPermissionNotice(true);
        }
      }
    );

    return () => {
      unsubPlayers();
      unsubChallenges();
    };
  }, [currentUser, profile.blockedUids, profile.isGuest]);

  // Listen to Active Online Match (Dual-Channel: RTDB ~50ms WebSocket + Firestore + Instant Offline Watchdog)
  useEffect(() => {
    if (!activeOnlineMatchId) return;

    onlineMatchCutRef.current = false;
    onlineOpponentUidRef.current = null;

    const cleanupPresenceWatch = () => {
      if (onlinePresenceUnsubRef.current) {
        onlinePresenceUnsubRef.current();
        onlinePresenceUnsubRef.current = null;
      }
    };

    const cutMatchWithAlert = (message: string, notifyServerUid?: string, reason: 'left' | 'offline' = 'offline') => {
      if (onlineMatchCutRef.current) return;
      onlineMatchCutRef.current = true;
      cleanupPresenceWatch();
      sound.playDisconnect();
      haptics.trigger([70, 50, 110]);
      if (notifyServerUid) {
        exitOnlineMatch(activeOnlineMatchId, notifyServerUid, reason).catch(() => {});
      }
      addToast(message, 'error');
      handleExitOnline(false);
    };

    const applyBoardAndRoundState = (params: {
      board: Board;
      currentTurn: Player;
      status: string;
      winner: Player | 'draw' | null;
      winningLine?: number[];
      round: number;
      exitedBy?: string;
      reason?: string;
      playerXUid?: string;
    }) => {
      if (onlineMatchCutRef.current) return;

      if (params.status === 'abandoned') {
        const leftByMe = params.exitedBy === currentUser?.uid;
        if (!leftByMe) {
          const effectiveSymbol: Player =
            myOnlineSymbol || (params.playerXUid === currentUser?.uid ? 'X' : 'O');
          const oppName = effectiveSymbol === 'X' ? onlineNamesRef.current.O : onlineNamesRef.current.X;
          const msg =
            params.reason === 'offline'
              ? `${oppName} went offline! Match ended.`
              : `${oppName} left the match! Match ended.`;
          cutMatchWithAlert(msg);
        } else {
          onlineMatchCutRef.current = true;
          cleanupPresenceWatch();
          addToast('You left the match.', 'info');
          handleExitOnline(false);
        }
        return;
      }

      const incomingRound = Number(params.round || 1);
      const nextBoard = Array.isArray(params.board) ? params.board : Array(9).fill(null);
      const piecesCount = nextBoard.filter((c) => c !== null).length;

      // Monotonicity guard: ignore stale snapshots from an older round or fewer pieces in the same round
      if (incomingRound < onlineRoundRef.current) return;
      if (incomingRound === onlineRoundRef.current && piecesCount < prevOnlinePiecesRef.current && params.status !== 'completed') {
        return;
      }

      // If a brand new rematch round started, reset piece counter
      if (incomingRound > onlineRoundRef.current) {
        onlineRoundRef.current = incomingRound;
        prevOnlinePiecesRef.current = 0;
        completedRoundKeyRef.current = null;
      }

      // Play loud move sound when a new move arrives from the opponent (own move already played optimistically!)
      if (piecesCount > prevOnlinePiecesRef.current && piecesCount > 0) {
        const lastMovedSymbol: Player = params.currentTurn === 'X' ? 'O' : 'X';
        sound.playMove(lastMovedSymbol);
        haptics.trigger(25);
      }
      prevOnlinePiecesRef.current = piecesCount;

      // Update board & turn immediately
      setBoard(nextBoard);
      setCurrentTurn(params.currentTurn);
      setWinningLine(params.winningLine || []);

      // Match Completion or Active Rematch (guarded so dual RTDB+Firestore events NEVER double-count!)
      const roundKey = `${activeOnlineMatchId}_r${incomingRound}`;
      if (params.status === 'completed') {
        setIsGameOver(true);
        if (completedRoundKeyRef.current !== roundKey) {
          completedRoundKeyRef.current = roundKey;
          const effectiveSymbol: Player =
            myOnlineSymbol || (params.playerXUid === currentUser?.uid ? 'X' : 'O');
          const won = params.winner === effectiveSymbol;
          const draw = params.winner === 'draw';
          const names = onlineNamesRef.current;
          const opponentName = effectiveSymbol === 'X' ? names.O : names.X;
          const winnerName =
            params.winner && params.winner !== 'draw' ? names[params.winner] : undefined;

          handleMatchEnded(
            draw ? 'draw' : won ? 'win' : 'loss',
            params.winner || 'draw',
            'Online Match',
            opponentName,
            winnerName,
            piecesCount
          );
        }
      } else if (params.status === 'active') {
        if (completedRoundKeyRef.current && completedRoundKeyRef.current !== roundKey) {
          completedRoundKeyRef.current = null;
        }
        setIsGameOver(false);
        setWinningLine([]);
        setResultModal((prev) => (prev.isOpen ? { isOpen: false, outcome: null, earnedXP: 0 } : prev));
      }
    };

    // 1. Fast RTDB WebSocket Live Move Listener (~40-90ms latency!)
    const unsubLive = listenToLiveMatchMoves(activeOnlineMatchId, (live) => {
      applyBoardAndRoundState({
        board: live.board,
        currentTurn: live.currentTurn,
        status: live.status,
        winner: live.winner,
        winningLine: live.winningLine,
        round: live.round,
        exitedBy: live.exitedBy,
        reason: live.reason
      });
    });

    // 2. Authoritative Firestore Match Metadata + Fallback Sync Listener
    const unsubMatch = listenToMatch(activeOnlineMatchId, (matchData) => {
      if (!matchData) {
        if (!onlineMatchCutRef.current) {
          cutMatchWithAlert('Match is no longer available.');
        }
        return;
      }

      const nextNames = {
        X: matchData.playerXName || 'Player X',
        O: matchData.playerOName || 'Player O'
      };
      onlineNamesRef.current = nextNames;
      setPlayerNames(nextNames);

      if (matchData.roomCode) {
        setCurrentRoomCode(matchData.roomCode);
      }

      if (Array.isArray(matchData.restartRequests) && currentUser) {
        setRestartRequestedByMe(matchData.restartRequests.includes(currentUser.uid));
      } else {
        setRestartRequestedByMe(false);
      }

      // Attach instant opponent offline / disconnect watcher once opponent UID is known
      if (currentUser && !onlineOpponentUidRef.current) {
        const oppUid =
          matchData.playerXUid === currentUser.uid ? matchData.playerOUid : matchData.playerXUid;
        if (oppUid && oppUid !== currentUser.uid) {
          onlineOpponentUidRef.current = oppUid;
          const oppName = matchData.playerXUid === currentUser.uid ? nextNames.O : nextNames.X;
          cleanupPresenceWatch();
          onlinePresenceUnsubRef.current = setupMatchPresenceAndWatchOpponent(
            activeOnlineMatchId,
            currentUser.uid,
            oppUid,
            () => {
              cutMatchWithAlert(`${oppName} went offline! Match ended.`, oppUid, 'offline');
            }
          );
        }
      }

      applyBoardAndRoundState({
        board: Array.isArray(matchData.board) ? matchData.board : Array(9).fill(null),
        currentTurn: matchData.currentTurn,
        status: matchData.status,
        winner: matchData.winner,
        winningLine: matchData.winningLine,
        round: Number(matchData.round || 1),
        exitedBy: matchData.exitedBy,
        reason: (matchData as any).exitReason,
        playerXUid: matchData.playerXUid
      });
    });

    // 3. Detect if THIS device drops offline mid-match
    const handleMyOffline = () => {
      cutMatchWithAlert('You went offline! Match disconnected.');
    };
    window.addEventListener('offline', handleMyOffline);

    // 4. Chat listener
    const unsubChat = listenToChat(activeOnlineMatchId, (messages) => {
      setChatMessages(messages);
    });

    return () => {
      window.removeEventListener('offline', handleMyOffline);
      cleanupPresenceWatch();
      unsubLive();
      unsubMatch();
      unsubChat();
    };
  }, [activeOnlineMatchId, myOnlineSymbol, currentUser]);

  // ==========================================
  // GAMEPLAY LOGIC
  // ==========================================

  const cancelPendingAIMove = () => {
    if (aiMoveTimerRef.current) {
      clearTimeout(aiMoveTimerRef.current);
      aiMoveTimerRef.current = null;
    }
  };

  const startComputerMatch = () => {
    cancelPendingAIMove();
    setGameMode('computer');
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setWinningLine([]);
    setIsGameOver(false);
    setMoveHistory([]);
    setPlayerNames({
      X: profile.displayName || 'Player X',
      O: 'XO Bot'
    });
    setScores({ X: 0, O: 0, draws: 0 });
    setActiveTab('arena');
  };

  const startLocalMatch = (nameX: string, nameO: string) => {
    cancelPendingAIMove();
    setGameMode('local');
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setWinningLine([]);
    setIsGameOver(false);
    setMoveHistory([]);
    setPlayerNames({
      X: nameX,
      O: nameO
    });
    setScores({ X: 0, O: 0, draws: 0 });
    setActiveTab('arena');
  };

  const handleCellClick = (index: number) => {
    if (board[index] !== null || isGameOver) return;

    if (gameMode === 'online') {
      if (!activeOnlineMatchId || !myOnlineSymbol || currentTurn !== myOnlineSymbol || moveInFlightRef.current) {
        return;
      }

      // 0ms Optimistic UI Update + Instant Loud Sound so tapping feels instantaneous!
      const prevBoard = [...board];
      const prevTurn = currentTurn;
      const optimisticBoard = [...board];
      optimisticBoard[index] = myOnlineSymbol;
      const nextPieces = optimisticBoard.filter((c) => c !== null).length;
      const nextTurn: Player = myOnlineSymbol === 'X' ? 'O' : 'X';
      const optimisticOutcome = checkWinner(optimisticBoard);

      sound.playMove(myOnlineSymbol);
      prevOnlinePiecesRef.current = nextPieces;
      setBoard(optimisticBoard);
      setCurrentTurn(nextTurn);
      if (optimisticOutcome) {
        setWinningLine(optimisticOutcome.line);
        setIsGameOver(true);
      }

      moveInFlightRef.current = true;
      makeOnlineMove(activeOnlineMatchId, index, myOnlineSymbol, prevBoard, onlineRoundRef.current)
        .catch(() => {
          // Roll back cleanly if network write fails
          prevOnlinePiecesRef.current = prevBoard.filter((c) => c !== null).length;
          setBoard(prevBoard);
          setCurrentTurn(prevTurn);
          setWinningLine([]);
          setIsGameOver(false);
          addToast('Move failed. Check connection.', 'error');
        })
        .finally(() => {
          moveInFlightRef.current = false;
        });
      return;
    }

    // Prevent human tapping during AI's thinking turn
    if (gameMode === 'computer' && currentTurn !== 'X') return;

    // Single Player or Local
    const newBoard = [...board];
    newBoard[index] = currentTurn;
    sound.playMove(currentTurn);
    setBoard(newBoard);
    setMoveHistory((prev) => [...prev, { index, player: currentTurn }]);

    const outcome = checkWinner(newBoard);
    if (outcome) {
      setIsGameOver(true);
      setWinningLine(outcome.line);
      const won = outcome.winner === 'X';
      const draw = outcome.winner === 'draw';

      if (gameMode === 'computer') {
        handleMatchEnded(
          draw ? 'draw' : won ? 'win' : 'loss',
          outcome.winner,
          `AI (${aiDifficulty})`
        );
      } else {
        // Local 2-Player
        handleMatchEnded(
          draw ? 'draw' : 'win',
          outcome.winner,
          'Local 2P'
        );
      }
      return;
    }

    const nextTurn = currentTurn === 'X' ? 'O' : 'X';
    setCurrentTurn(nextTurn);

    // AI Response move (tracked by ref so Restart/Undo/Exit cleanly cancels it; snappy 260ms feel)
    if (gameMode === 'computer' && nextTurn === 'O') {
      cancelPendingAIMove();
      aiMoveTimerRef.current = setTimeout(() => {
        aiMoveTimerRef.current = null;
        executeAIMove(newBoard);
      }, 260);
    }
  };

  const executeAIMove = (currentBoard: Board) => {
    const aiMoveIndex = getAIMove(currentBoard, aiDifficulty, 'O', 'X');
    if (aiMoveIndex === -1) return;

    const updatedBoard = [...currentBoard];
    updatedBoard[aiMoveIndex] = 'O';
    sound.playMove('O');
    setBoard(updatedBoard);
    setMoveHistory((prev) => [...prev, { index: aiMoveIndex, player: 'O' }]);

    const outcome = checkWinner(updatedBoard);
    if (outcome) {
      setIsGameOver(true);
      setWinningLine(outcome.line);
      const draw = outcome.winner === 'draw';
      handleMatchEnded(
        draw ? 'draw' : outcome.winner === 'X' ? 'win' : 'loss',
        outcome.winner,
        `AI (${aiDifficulty})`
      );
    } else {
      setCurrentTurn('X');
    }
  };

  const handleMatchEnded = (
    result: 'win' | 'loss' | 'draw',
    winner: Player | 'draw',
    modeDescription: string,
    opponentOverride?: string,
    winnerNameOverride?: string,
    movesOverride?: number
  ) => {
    // Sound & Haptic
    if (result === 'win') {
      sound.playWin();
      haptics.trigger([50, 50, 100]);
    } else if (result === 'loss') {
      sound.playLoss();
      haptics.trigger([80, 50, 80]);
    } else if (result === 'draw') {
      sound.playDraw();
      haptics.trigger(60);
    }

    // Award XP
    let earnedXP = 15;
    if (result === 'win') earnedXP += 45;
    if (result === 'draw') earnedXP += 15;
    if (modeDescription.includes('Hard') || modeDescription.includes('hard')) earnedXP += 20;

    // Update Scores in Arena
    if (winner !== 'draw') {
      setScores((prev) => ({
        ...prev,
        [winner]: prev[winner] + 1
      }));
    } else {
      setScores((prev) => ({
        ...prev,
        draws: prev.draws + 1
      }));
    }

    // Update Profile Stats using latest profileRef (consistent XP-based level everywhere)
    const updatedProf: UserProfile = { ...profileRef.current };
    updatedProf.matches = (updatedProf.matches || 0) + 1;
    updatedProf.xp = (updatedProf.xp || 0) + earnedXP;
    updatedProf.level = calculateLevelInfo(updatedProf.xp).level;

    if (result === 'win') {
      updatedProf.wins = (updatedProf.wins || 0) + 1;
      updatedProf.streak = (updatedProf.streak || 0) + 1;
      updatedProf.bestStreak = Math.max(updatedProf.streak, updatedProf.bestStreak || 0);

      if (gameMode === 'computer') {
        updatedProf.aiWins = (updatedProf.aiWins || 0) + 1;
      }
    } else if (result === 'loss') {
      updatedProf.losses = (updatedProf.losses || 0) + 1;
      updatedProf.streak = 0;
    } else {
      updatedProf.draws = (updatedProf.draws || 0) + 1;
      updatedProf.streak = 0;
    }

    setProfile(updatedProf);
    storage.saveProfile(updatedProf);
    if (currentUser && !currentUser.isAnonymous) {
      syncUserProfile(updatedProf);
    }

    // Add match record to history
    const record: MatchRecord = {
      id: 'M_' + Date.now().toString(36),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      opponent: opponentOverride || playerNames.O,
      mode: modeDescription,
      result: result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw',
      moves: movesOverride ?? moveHistory.length + 1
    };
    storage.addHistory(record);
    setHistory(storage.getHistory());

    // Check Achievements
    checkAchievements(updatedProf, result, modeDescription);

    // Show Result Modal
    setResultModal({
      isOpen: true,
      outcome: result,
      winnerName: winnerNameOverride ?? (winner !== 'draw' ? playerNames[winner] : undefined),
      earnedXP
    });
  };

  const checkAchievements = (prof: UserProfile, result: string, mode: string) => {
    const newlyUnlocked: string[] = [];
    if (prof.wins >= 1 && storage.unlockAchievement('first_win')) {
      newlyUnlocked.push('First Blood');
    }
    if (prof.streak >= 3 && storage.unlockAchievement('win_streak_3')) {
      newlyUnlocked.push('Hot Streak');
    }
    if (prof.wins >= 5 && storage.unlockAchievement('five_wins')) {
      newlyUnlocked.push('Veteran Competitor');
    }
    if (prof.draws >= 1 && storage.unlockAchievement('first_draw')) {
      newlyUnlocked.push('Stalemate Master');
    }
    if (mode.toLowerCase().includes('hard') && result === 'win' && storage.unlockAchievement('beat_hard_ai')) {
      newlyUnlocked.push('Cyber Conqueror');
    }
    if (mode.toLowerCase().includes('online') && result === 'win' && storage.unlockAchievement('online_victor')) {
      newlyUnlocked.push('Global Dominator');
    }

    if (newlyUnlocked.length > 0) {
      setUnlockedAchievements(storage.getAchievements());
      newlyUnlocked.forEach((name) => addToast(`Achievement Unlocked: ${name}!`, 'success'));
    }
  };

  const handleUndoMove = () => {
    if (gameMode === 'online') {
      addToast('Undo is not permitted in online matches.', 'error');
      return;
    }
    if (moveHistory.length === 0 || isGameOver) return;
    cancelPendingAIMove();

    if (gameMode === 'computer') {
      // Undo both AI move and Player move
      if (moveHistory.length >= 2) {
        const lastTwo = moveHistory.slice(-2);
        const newBoard = [...board];
        newBoard[lastTwo[0].index] = null;
        newBoard[lastTwo[1].index] = null;
        setBoard(newBoard);
        setMoveHistory((prev) => prev.slice(0, -2));
        setCurrentTurn('X');
      } else if (moveHistory.length === 1) {
        const last = moveHistory[0];
        const newBoard = [...board];
        newBoard[last.index] = null;
        setBoard(newBoard);
        setMoveHistory([]);
        setCurrentTurn('X');
      }
    } else {
      // Local
      const last = moveHistory[moveHistory.length - 1];
      const newBoard = [...board];
      newBoard[last.index] = null;
      setBoard(newBoard);
      setMoveHistory((prev) => prev.slice(0, -1));
      setCurrentTurn(last.player);
    }
  };

  const handleRestartGame = () => {
    if (gameMode === 'online' && activeOnlineMatchId && currentUser) {
      requestMatchRestart(activeOnlineMatchId, currentUser.uid);
      setRestartRequestedByMe(true);
      addToast('Restart requested. Waiting for opponent...');
      return;
    }

    cancelPendingAIMove();
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setWinningLine([]);
    setIsGameOver(false);
    setMoveHistory([]);
    setResultModal({ isOpen: false, outcome: null, earnedXP: 0 });
  };

  const clearOutgoingChallenge = useCallback((cancelRemote: boolean = false) => {
    if (outgoingChallengeUnsubRef.current) {
      outgoingChallengeUnsubRef.current();
      outgoingChallengeUnsubRef.current = null;
    }
    if (outgoingChallengeTimerRef.current) {
      clearTimeout(outgoingChallengeTimerRef.current);
      outgoingChallengeTimerRef.current = null;
    }
    setOutgoingChallenge((prev) => {
      if (cancelRemote && prev) {
        cancelOutgoingChallenge(prev.targetUid, prev.id).catch(() => {});
      }
      return null;
    });
  }, []);

  const clearPendingPrivateRoom = useCallback((cancelRemote: boolean = false) => {
    if (privateRoomWaiterRef.current) {
      privateRoomWaiterRef.current();
      privateRoomWaiterRef.current = null;
    }
    if (cancelRemote && pendingRoomMatchIdRef.current && currentUser) {
      exitOnlineMatch(pendingRoomMatchIdRef.current, currentUser.uid).catch(() => {});
    }
    pendingRoomMatchIdRef.current = null;
    setCreatedRoomCode(null);
  }, [currentUser]);

  const enterOnlineArena = useCallback((matchId: string, symbol: Player, roomCode?: string) => {
    completedRoundKeyRef.current = null;
    prevOnlinePiecesRef.current = 0;
    onlineRoundRef.current = 1;
    onlineOpponentUidRef.current = null;
    onlineMatchCutRef.current = false;
    moveInFlightRef.current = false;
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setWinningLine([]);
    setIsGameOver(false);
    setScores({ X: 0, O: 0, draws: 0 });
    setChatMessages([]);
    setRestartRequestedByMe(false);
    setResultModal({ isOpen: false, outcome: null, earnedXP: 0 });
    setCurrentRoomCode(roomCode);
    setMyOnlineSymbol(symbol);
    setActiveOnlineMatchId(matchId);
    setGameMode('online');
    setActiveTab('arena');
  }, []);

  const handleExitOnline = (notifyServer: boolean = true) => {
    if (onlinePresenceUnsubRef.current) {
      onlinePresenceUnsubRef.current();
      onlinePresenceUnsubRef.current = null;
    }
    if (notifyServer && activeOnlineMatchId && currentUser) {
      exitOnlineMatch(activeOnlineMatchId, currentUser.uid, 'left');
    }
    completedRoundKeyRef.current = null;
    prevOnlinePiecesRef.current = 0;
    onlineRoundRef.current = 1;
    onlineOpponentUidRef.current = null;
    onlineMatchCutRef.current = false;
    moveInFlightRef.current = false;
    setActiveOnlineMatchId(null);
    setMyOnlineSymbol(undefined);
    setCurrentRoomCode(undefined);
    setChatMessages([]);
    setRestartRequestedByMe(false);
    setResultModal({ isOpen: false, outcome: null, earnedXP: 0 });
    setGameMode('computer');
    setActiveTab('online');
  };

  // ==========================================
  // ONLINE MULTIPLAYER ACTIONS
  // ==========================================

  const handleStartMatchmaking = async () => {
    if (isMatchmaking) return;

    // Cancel any other pending invite/room before entering Quick Match queue
    clearOutgoingChallenge(true);
    clearPendingPrivateRoom(true);

    haptics.trigger([30, 40, 30]);
    setIsMatchmaking(true);
    setMatchmakingTime(0);
    addToast('Quick Match started! Searching for opponent...');

    if (matchmakingTimerRef.current) {
      clearInterval(matchmakingTimerRef.current);
    }
    matchmakingTimerRef.current = setInterval(() => {
      setMatchmakingTime((t) => t + 1);
    }, 1000);

    try {
      const queueHandler = await joinMatchmakingQueue(
        profileRef.current,
        (matchId, role) => {
          if (matchmakingTimerRef.current) {
            clearInterval(matchmakingTimerRef.current);
            matchmakingTimerRef.current = null;
          }
          matchmakingCancelRef.current = null;
          setIsMatchmaking(false);
          sound.playJoin();
          haptics.trigger([40, 40, 80]);
          addToast('Match found! Entering arena...', 'success');
          enterOnlineArena(matchId, role);
        },
        () => {}
      );

      matchmakingCancelRef.current = queueHandler.cancel;
    } catch (err: any) {
      if (matchmakingTimerRef.current) {
        clearInterval(matchmakingTimerRef.current);
        matchmakingTimerRef.current = null;
      }
      setIsMatchmaking(false);
      addToast(`Matchmaking error: ${err.message}`, 'error');
    }
  };

  const handleCancelMatchmaking = async () => {
    if (matchmakingCancelRef.current) {
      await matchmakingCancelRef.current();
      matchmakingCancelRef.current = null;
    }
    if (matchmakingTimerRef.current) {
      clearInterval(matchmakingTimerRef.current);
      matchmakingTimerRef.current = null;
    }
    setIsMatchmaking(false);
    addToast('Matchmaking cancelled.');
  };

  const handleCreatePrivateRoom = async () => {
    try {
      clearPendingPrivateRoom(true);
      clearOutgoingChallenge(true);

      const { matchId, roomCode } = await createPrivateRoom(profileRef.current);
      pendingRoomMatchIdRef.current = matchId;
      setCreatedRoomCode(roomCode);
      addToast(`Room ${roomCode} created! Share with your friend.`);

      // Listen for friend joining and immediately unsubscribe once joined
      const unsubWaiter = listenToMatch(matchId, (matchData) => {
        if (!matchData || matchData.status === 'abandoned') {
          clearPendingPrivateRoom(false);
          return;
        }
        if (matchData.status === 'active' && matchData.playerOUid) {
          clearPendingPrivateRoom(false);
          sound.playJoin();
          haptics.trigger([40, 40, 80]);
          addToast(`${matchData.playerOName} joined your room!`, 'success');
          enterOnlineArena(matchId, 'X', roomCode);
        }
      });
      privateRoomWaiterRef.current = unsubWaiter;
    } catch (err: any) {
      addToast(`Failed to create room: ${err.message}`, 'error');
    }
  };

  const handleJoinPrivateRoom = async (code: string) => {
    try {
      clearPendingPrivateRoom(true);
      clearOutgoingChallenge(true);
      const matchId = await joinPrivateRoom(code, profileRef.current);
      sound.playJoin();
      haptics.trigger([40, 40, 80]);
      addToast('Joined private room!', 'success');
      enterOnlineArena(matchId, 'O', code.trim().toUpperCase());
    } catch (err: any) {
      addToast(err.message || 'Could not join room', 'error');
    }
  };

  const handleSendChallenge = async (targetUid: string, targetName: string) => {
    try {
      clearOutgoingChallenge(true);
      clearPendingPrivateRoom(true);
      if (isMatchmaking) {
        await handleCancelMatchmaking();
      }

      sound.playChallengeSent();
      haptics.trigger(30);

      const challengeId = await sendDirectChallenge(targetUid, profileRef.current);
      setOutgoingChallenge({ id: challengeId, targetUid, targetName });
      addToast(`Challenge sent to ${targetName}! Waiting for acceptance...`);

      // Listen on target's challenge doc so CHALLENGER ALSO enters the match immediately when accepted!
      const unsubOut = listenToOutgoingChallenge(
        targetUid,
        challengeId,
        (matchId) => {
          clearOutgoingChallenge(false);
          sound.playJoin();
          haptics.trigger([40, 40, 80]);
          addToast(`${targetName} accepted! Entering match...`, 'success');
          enterOnlineArena(matchId, 'X');
        },
        () => {
          clearOutgoingChallenge(false);
          addToast(`${targetName} declined your challenge.`, 'info');
        }
      );
      outgoingChallengeUnsubRef.current = unsubOut;

      // Auto-expire unanswered challenge after 60 seconds
      outgoingChallengeTimerRef.current = setTimeout(() => {
        clearOutgoingChallenge(true);
        addToast(`Challenge to ${targetName} expired.`, 'info');
      }, 60000);
    } catch (err: any) {
      addToast(`Challenge failed: ${err.message}`, 'error');
    }
  };

  const handleAcceptChallenge = async (challenge: DirectChallenge) => {
    try {
      clearOutgoingChallenge(true);
      clearPendingPrivateRoom(true);
      if (isMatchmaking) {
        await handleCancelMatchmaking();
      }

      const matchId = await acceptChallenge(challenge, profileRef.current);
      sound.playJoin();
      haptics.trigger([40, 40, 80]);
      setIncomingChallenge(null);
      addToast('Challenge accepted! Entering match...', 'success');
      enterOnlineArena(matchId, 'O');
    } catch (err: any) {
      setIncomingChallenge(null);
      addToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeclineChallenge = async (_challenge: DirectChallenge) => {
    if (currentUser) {
      await declineChallenge(currentUser.uid);
    }
    setIncomingChallenge(null);
    addToast('Challenge declined.');
  };

  const handleSendChatMessage = (text: string) => {
    if (!activeOnlineMatchId || !currentUser) return;
    sendChatMessage(activeOnlineMatchId, text, currentUser.uid, profile.displayName || 'Player');
  };

  // Theme Cycling
  const handleThemeCycle = () => {
    const themes: AppTheme[] = ['light', 'neon', 'black', 'ocean', 'emerald', 'crimson'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIdx]);
    addToast(`Theme: ${themes[nextIdx].toUpperCase()}`);
  };

  const handleSplashComplete = useCallback(() => {
    setIsAppLoading(false);
  }, []);

  if (isAppLoading || !authReady) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const isSignedInAccount = Boolean(currentUser && !currentUser.isAnonymous);
  const showEntryGate = !isSignedInAccount && !hasChosenEntryMode;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto shadow-2xl relative select-none">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header */}
      <Header
        currentTheme={theme}
        isDark={isDark}
        onThemeCycle={handleThemeCycle}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenAuth={() => setAuthModalOpen(true)}
        isLoggedIn={Boolean(currentUser && !currentUser.isAnonymous)}
        userDisplayName={profile.displayName}
      />

      {/* Firebase Rules Notice Banner */}
      {hasRulesPermissionNotice && (
        <div className="mx-4 mt-2.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base flex-shrink-0">⚠️</span>
            <span className="truncate font-semibold">
              Firebase Security Rules: Please paste firestore.rules in Firebase Console.
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}`);
                addToast('Firebase Rules copied to clipboard!', 'success');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              Copy Rules
            </button>
            <button
              onClick={() => setHasRulesPermissionNotice(false)}
              className="px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 pb-32 overflow-x-hidden">
        {activeTab === 'home' && (
          <HomeScreen
            profile={profile}
            onLaunchComputer={startComputerMatch}
            onLaunchLocal={() => setLocalSetupOpen(true)}
            onLaunchOnline={() => setActiveTab('online')}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'arena' && (
          <GameArena
            mode={gameMode}
            aiDifficulty={aiDifficulty}
            onChangeAIDifficulty={(diff) => {
              setAiDifficulty(diff);
              handleRestartGame();
              addToast(`AI Difficulty: ${diff.toUpperCase()}`);
            }}
            playerXName={playerNames.X}
            playerOName={playerNames.O}
            scoreX={scores.X}
            scoreO={scores.O}
            currentTurn={currentTurn}
            mySymbol={myOnlineSymbol}
            board={board}
            winningLine={winningLine}
            isGameOver={isGameOver}
            onCellClick={handleCellClick}
            onUndo={handleUndoMove}
            onRestart={handleRestartGame}
            onExit={() => {
              if (gameMode === 'online') handleExitOnline();
              else setActiveTab('home');
            }}
            roomCode={currentRoomCode}
            chatMessages={chatMessages}
            onSendMessage={handleSendChatMessage}
            myUid={currentUser?.uid}
            restartRequestedByMe={restartRequestedByMe}
          />
        )}

        {activeTab === 'online' && (
          <OnlineLobby
            profile={profile}
            onlinePlayers={onlinePlayers}
            isMatchmaking={isMatchmaking}
            matchmakingTime={matchmakingTime}
            onStartMatchmaking={handleStartMatchmaking}
            onCancelMatchmaking={handleCancelMatchmaking}
            onCreatePrivateRoom={handleCreatePrivateRoom}
            onJoinPrivateRoom={handleJoinPrivateRoom}
            onSendChallenge={handleSendChallenge}
            outgoingChallenge={outgoingChallenge}
            onCancelOutgoingChallenge={() => {
              clearOutgoingChallenge(true);
              addToast('Challenge cancelled.');
            }}
            createdRoomCode={createdRoomCode}
            onCancelRoom={() => {
              clearPendingPrivateRoom(true);
              addToast('Room cancelled.');
            }}
            onRefreshPlayers={async () => {
              const latest = await fetchOnlinePlayersOnce();
              setOnlinePlayers(latest);
              addToast('Refreshed active players list.');
            }}
            myUid={currentUser?.uid}
            isGuest={Boolean(profile.isGuest || !currentUser || currentUser.isAnonymous)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            history={history}
            onClearHistory={() => {
              storage.clearHistory();
              setHistory([]);
              addToast('Local history cleared.');
            }}
          />
        )}

        {activeTab === 'ranks' && (
          <LeaderboardScreen
            players={leaderboard}
            currentUid={currentUser?.uid}
            isGuest={Boolean(profile.isGuest || !currentUser || currentUser.isAnonymous)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            profile={profile}
            unlockedAchievements={unlockedAchievements}
            onSaveProfile={async (displayName, avatarUrl, avatarEmoji) => {
              const isRealUser = Boolean(currentUser && !currentUser.isAnonymous);
              const updated = {
                ...profile,
                displayName,
                avatarUrl,
                avatarEmoji,
                isGuest: !isRealUser
              };
              setProfile(updated);
              storage.saveProfile(updated);
              if (currentUser) {
                const synced = await syncUserProfile(updated, true);
                setProfile(synced);
                storage.saveProfile(synced);
                setupPresence(currentUser, synced);
              }
              // Immediately update leaderboard state so new avatar emoji shows right away!
              setLeaderboard((prev) =>
                prev.map((p) =>
                  p.uid === currentUser?.uid
                    ? { ...p, displayName, avatarUrl, avatarEmoji }
                    : p
                )
              );
              addToast('Profile updated successfully!', 'success');
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            isLoggedIn={Boolean(currentUser && !currentUser.isAnonymous)}
            email={currentUser?.email}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            currentTheme={theme}
            onThemeChange={setTheme}
            isDark={isDark}
            onToggleDark={setIsDark}
            soundEnabled={soundEnabled}
            onToggleSound={setSoundEnabled}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={setHapticsEnabled}
            onResetData={() => {
              setConfirmDialog({
                title: 'Reset Local Data?',
                message: 'This will reset all your local game stats, achievements, and match history.',
                confirmLabel: 'Reset All',
                onConfirm: () => {
                  setConfirmDialog(null);
                  storage.clearAll();
                  window.location.reload();
                }
              });
            }}
            onSignOut={async () => {
              clearOutgoingChallenge(true);
              clearPendingPrivateRoom(true);
              if (isMatchmaking) {
                await handleCancelMatchmaking();
              }
              const wasGuest = Boolean(profile.isGuest || currentUser?.isAnonymous);
              await logOut(wasGuest);
              const freshProf = storage.getProfile();
              setProfile(freshProf);
              setHasChosenEntryMode(false);
              addToast(wasGuest ? 'Guest session erased permanently.' : 'Signed out successfully.');
            }}
            isLoggedIn={Boolean(currentUser && !currentUser.isAnonymous)}
            isGuest={Boolean(profile.isGuest || currentUser?.isAnonymous)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (activeTab === 'arena' && gameMode === 'online') {
            setConfirmDialog({
              title: 'Leave Online Match?',
              message: 'Leaving now will end this live match for both players.',
              confirmLabel: 'Leave Match',
              onConfirm: () => {
                setConfirmDialog(null);
                handleExitOnline(true);
                setActiveTab(tab);
              }
            });
            return;
          }
          setActiveTab(tab);
        }}
        onlinePlayerCount={onlinePlayers.filter((p) => p.uid !== currentUser?.uid).length}
      />

      {/* In-App Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-xs rounded-3xl border p-5 flex flex-col items-center text-center shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <h3 className="font-display font-black text-lg" style={{ color: 'var(--text-main)' }}>
              {confirmDialog.title}
            </h3>
            <p className="text-xs mt-1.5 mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {confirmDialog.message}
            </p>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  confirmDialog.onConfirm();
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 cursor-pointer"
                style={{ backgroundColor: 'var(--danger)' }}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        outcome={resultModal.outcome}
        winnerName={resultModal.winnerName}
        earnedXP={resultModal.earnedXP}
        onPlayAgain={handleRestartGame}
        onClose={() => setResultModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Challenge Invitation Modal */}
      <ChallengeModal
        challenge={incomingChallenge}
        onAccept={handleAcceptChallenge}
        onDecline={handleDeclineChallenge}
      />

      {/* Local 2-Player Name Setup Modal */}
      <LocalSetupModal
        isOpen={localSetupOpen}
        defaultNameX={profile.displayName || 'Player 1'}
        onStart={(nameX, nameO) => {
          setLocalSetupOpen(false);
          startLocalMatch(nameX, nameO);
        }}
        onCancel={() => setLocalSetupOpen(false)}
      />

      {/* Authentication Modal (Startup Entry Gate or On-Demand Sign In) */}
      <AuthModal
        isOpen={showEntryGate || authModalOpen}
        isEntryGate={showEntryGate}
        onClose={() => setAuthModalOpen(false)}
        onSignIn={async (email, pass) => {
          await loginWithEmail(email, pass);
          setHasChosenEntryMode(true);
          addToast('Signed in successfully!', 'success');
        }}
        onRegister={async (email, pass, fullName, avatarEmoji) => {
          await registerWithEmail(email, pass, fullName, avatarEmoji);
          setHasChosenEntryMode(true);
          addToast('Account created and verified!', 'success');
        }}
        onContinueGuest={() => {
          const guestProf = storage.getProfile();
          guestProf.isGuest = true;
          delete guestProf.numericUid;
          storage.saveProfile(guestProf);
          setProfile({ ...guestProf });
          setHasChosenEntryMode(true);
          addToast('Playing as Guest (No ID).');
        }}
      />
    </div>
  );
}

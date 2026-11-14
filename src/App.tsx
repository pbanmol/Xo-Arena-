import React, { useState, useEffect, useRef } from 'react';
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
import { storage } from './services/storage';
import { sound } from './services/sound';
import { haptics } from './services/haptics';
import { checkWinner, getAIMove } from './services/ai';
import {
  acceptChallenge,
  createPrivateRoom,
  declineChallenge,
  exitOnlineMatch,
  initAuthListener,
  joinMatchmakingQueue,
  joinPrivateRoom,
  listenToChat,
  listenToIncomingChallenges,
  listenToLeaderboard,
  listenToMatch,
  listenToOnlinePlayers,
  loginWithEmail,
  logOut,
  makeOnlineMove,
  registerWithEmail,
  requestMatchRestart,
  sendChatMessage,
  sendDirectChallenge,
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

  // Sync theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.set('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-dark', isDark ? 'true' : 'false');
    storage.set('dark_mode', isDark);
  }, [isDark]);

  useEffect(() => {
    sound.enabled = soundEnabled;
    storage.set('sound', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    haptics.enabled = hapticsEnabled;
    storage.set('haptics', hapticsEnabled);
  }, [hapticsEnabled]);

  // Auth & Presence Initialization
  useEffect(() => {
    let presenceCleanup: any = null;
    const authTimeout = setTimeout(() => {
      setAuthReady(true);
    }, 2000);

    const unsubAuth = initAuthListener(async (user) => {
      clearTimeout(authTimeout);
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        if (!user.isAnonymous) {
          setHasChosenEntryMode(true);
        }
        // Lock permanent, immutable UIDs once and for all (Anmol is permanently UID 1)
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
      }
    });

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
          if (profile.blockedUids.includes(challenge.senderUid)) {
            declineChallenge(currentUser.uid);
            return;
          }
          setIncomingChallenge(challenge);
        } else {
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

  // Listen to Active Online Match
  useEffect(() => {
    if (!activeOnlineMatchId) return;

    const unsubMatch = listenToMatch(activeOnlineMatchId, (matchData) => {
      if (!matchData) {
        addToast('Match is no longer available.', 'error');
        handleExitOnline();
        return;
      }

      if (matchData.status === 'abandoned') {
        const leftByMe = matchData.exitedBy === currentUser?.uid;
        addToast(leftByMe ? 'You left the match.' : 'Opponent has disconnected or left.', 'info');
        handleExitOnline();
        return;
      }

      // Update board & turn
      setBoard(matchData.board);
      setCurrentTurn(matchData.currentTurn);
      setWinningLine(matchData.winningLine || []);
      setPlayerNames({
        X: matchData.playerXName || 'Player X',
        O: matchData.playerOName || 'Player O'
      });

      if (matchData.roomCode) {
        setCurrentRoomCode(matchData.roomCode);
      }

      // Check if opponent requested restart
      if (Array.isArray(matchData.restartRequests) && currentUser) {
        setRestartRequestedByMe(matchData.restartRequests.includes(currentUser.uid));
      }

      // Match Completion or Active Rematch
      if (matchData.status === 'completed') {
        setIsGameOver(true);
        const won = myOnlineSymbol && matchData.winner === myOnlineSymbol;
        const draw = matchData.winner === 'draw';

        handleMatchEnded(draw ? 'draw' : won ? 'win' : 'loss', matchData.winner || 'draw', 'Online Match');
      } else if (matchData.status === 'active') {
        setIsGameOver(false);
        setWinningLine([]);
        setResultModal((prev) => (prev.isOpen ? { isOpen: false, outcome: null, earnedXP: 0 } : prev));
        setRestartRequestedByMe(false);
      }
    });

    // Chat listener
    const unsubChat = listenToChat(activeOnlineMatchId, (messages) => {
      setChatMessages(messages);
    });

    return () => {
      unsubMatch();
      unsubChat();
    };
  }, [activeOnlineMatchId, myOnlineSymbol, currentUser]);

  // ==========================================
  // GAMEPLAY LOGIC
  // ==========================================

  const startComputerMatch = () => {
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
      if (!activeOnlineMatchId || !myOnlineSymbol || currentTurn !== myOnlineSymbol) return;
      makeOnlineMove(activeOnlineMatchId, index, myOnlineSymbol);
      return;
    }

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

    // AI Response move
    if (gameMode === 'computer' && nextTurn === 'O') {
      setTimeout(() => {
        executeAIMove(newBoard);
      }, 350);
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
    modeDescription: string
  ) => {
    // Sound & Haptic
    if (result === 'win') {
      sound.playWin();
      haptics.trigger([50, 50, 100]);
    } else if (result === 'draw') {
      sound.playDraw();
      haptics.trigger(60);
    }

    // Award XP
    let earnedXP = 15;
    if (result === 'win') earnedXP += 45;
    if (result === 'draw') earnedXP += 15;
    if (modeDescription.includes('Hard')) earnedXP += 20;

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

    // Update Profile Stats
    const updatedProf: UserProfile = { ...profile };
    updatedProf.matches = (updatedProf.matches || 0) + 1;
    updatedProf.xp = (updatedProf.xp || 0) + earnedXP;

    if (result === 'win') {
      updatedProf.wins = (updatedProf.wins || 0) + 1;
      updatedProf.streak = (updatedProf.streak || 0) + 1;
      updatedProf.bestStreak = Math.max(updatedProf.streak, updatedProf.bestStreak || 0);

      if (gameMode === 'computer') {
        updatedProf.aiWins = (updatedProf.aiWins || 0) + 1;
        updatedProf.level = 1 + updatedProf.aiWins;
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
    if (currentUser) {
      syncUserProfile(updatedProf);
    }

    // Add match record to history
    const record: MatchRecord = {
      id: 'M_' + Date.now().toString(36),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      opponent: playerNames.O,
      mode: modeDescription,
      result: result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw',
      moves: moveHistory.length + 1
    };
    storage.addHistory(record);
    setHistory(storage.getHistory());

    // Check Achievements
    checkAchievements(updatedProf, result, modeDescription);

    // Show Result Modal
    setResultModal({
      isOpen: true,
      outcome: result,
      winnerName: winner !== 'draw' ? playerNames[winner] : undefined,
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
    if (mode.includes('Hard') && result === 'win' && storage.unlockAchievement('beat_hard_ai')) {
      newlyUnlocked.push('Cyber Conqueror');
    }
    if (mode.includes('Online') && result === 'win' && storage.unlockAchievement('online_victor')) {
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

    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setWinningLine([]);
    setIsGameOver(false);
    setMoveHistory([]);
    setResultModal({ isOpen: false, outcome: null, earnedXP: 0 });
  };

  const handleExitOnline = () => {
    if (activeOnlineMatchId && currentUser) {
      exitOnlineMatch(activeOnlineMatchId, currentUser.uid);
    }
    setActiveOnlineMatchId(null);
    setMyOnlineSymbol(undefined);
    setCurrentRoomCode(undefined);
    setRestartRequestedByMe(false);
    setGameMode('computer');
    setActiveTab('online');
  };

  // ==========================================
  // ONLINE MULTIPLAYER ACTIONS
  // ==========================================

  const handleStartMatchmaking = async () => {
    if (isMatchmaking) return;
    setIsMatchmaking(true);
    setMatchmakingTime(0);

    matchmakingTimerRef.current = setInterval(() => {
      setMatchmakingTime((t) => t + 1);
    }, 1000);

    try {
      const queueHandler = await joinMatchmakingQueue(
        profile,
        (matchId, role) => {
          clearInterval(matchmakingTimerRef.current);
          setIsMatchmaking(false);
          sound.playJoin();
          addToast('Match found! Entering arena...', 'success');

          setActiveOnlineMatchId(matchId);
          setMyOnlineSymbol(role);
          setGameMode('online');
          setActiveTab('arena');
        },
        (statusText) => {
          // status update
        }
      );

      matchmakingCancelRef.current = queueHandler.cancel;
    } catch (err: any) {
      clearInterval(matchmakingTimerRef.current);
      setIsMatchmaking(false);
      addToast(`Matchmaking error: ${err.message}`, 'error');
    }
  };

  const handleCancelMatchmaking = async () => {
    if (matchmakingCancelRef.current) {
      await matchmakingCancelRef.current();
    }
    if (matchmakingTimerRef.current) {
      clearInterval(matchmakingTimerRef.current);
    }
    setIsMatchmaking(false);
    addToast('Matchmaking cancelled.');
  };

  const handleCreatePrivateRoom = async () => {
    try {
      const { matchId, roomCode } = await createPrivateRoom(profile);
      setCreatedRoomCode(roomCode);
      setCurrentRoomCode(roomCode);
      setActiveOnlineMatchId(matchId);
      setMyOnlineSymbol('X');
      addToast(`Room ${roomCode} created! Share with your friend.`);

      // Listen for friend joining
      listenToMatch(matchId, (matchData) => {
        if (matchData && matchData.status === 'active' && matchData.playerOUid) {
          setCreatedRoomCode(null);
          sound.playJoin();
          addToast(`${matchData.playerOName} joined your room!`, 'success');
          setGameMode('online');
          setActiveTab('arena');
        }
      });
    } catch (err: any) {
      addToast(`Failed to create room: ${err.message}`, 'error');
    }
  };

  const handleJoinPrivateRoom = async (code: string) => {
    try {
      const matchId = await joinPrivateRoom(code, profile);
      sound.playJoin();
      addToast('Joined private room!', 'success');

      setActiveOnlineMatchId(matchId);
      setMyOnlineSymbol('O');
      setCurrentRoomCode(code);
      setGameMode('online');
      setActiveTab('arena');
    } catch (err: any) {
      addToast(err.message || 'Could not join room', 'error');
    }
  };

  const handleSendChallenge = async (targetUid: string, targetName: string) => {
    try {
      await sendDirectChallenge(targetUid, profile);
      addToast(`Challenge sent to ${targetName}! Waiting for response...`);
    } catch (err: any) {
      addToast(`Challenge failed: ${err.message}`, 'error');
    }
  };

  const handleAcceptChallenge = async (challenge: DirectChallenge) => {
    try {
      const matchId = await acceptChallenge(challenge, profile);
      sound.playJoin();
      setIncomingChallenge(null);
      addToast('Challenge accepted! Entering match...', 'success');

      setActiveOnlineMatchId(matchId);
      setMyOnlineSymbol('O');
      setGameMode('online');
      setActiveTab('arena');
    } catch (err: any) {
      addToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeclineChallenge = async (challenge: DirectChallenge) => {
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

  if (isAppLoading || !authReady) {
    return <SplashScreen onComplete={() => setIsAppLoading(false)} />;
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
            createdRoomCode={createdRoomCode}
            onCancelRoom={() => {
              setCreatedRoomCode(null);
              addToast('Room cancelled.');
            }}
            onRefreshPlayers={() => {
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
              if (confirm('Reset all your local game stats, achievements, and level?')) {
                storage.clearAll();
                window.location.reload();
              }
            }}
            onSignOut={async () => {
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
            if (!confirm('Leave current online match?')) return;
            handleExitOnline();
          }
          setActiveTab(tab);
        }}
        onlinePlayerCount={onlinePlayers.filter((p) => p.uid !== currentUser?.uid).length}
      />

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

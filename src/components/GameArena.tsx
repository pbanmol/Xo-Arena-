import React, { useState, useRef, useEffect } from 'react';
import { AIDifficulty, Board, ChatMessage, GameMode, Player } from '../types/game';
import { sound } from '../services/sound';
import { haptics } from '../services/haptics';

interface GameArenaProps {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  onChangeAIDifficulty: (diff: AIDifficulty) => void;
  playerXName: string;
  playerOName: string;
  scoreX: number;
  scoreO: number;
  currentTurn: Player;
  mySymbol?: Player;
  board: Board;
  winningLine: number[];
  isGameOver: boolean;
  onCellClick: (index: number) => void;
  onUndo: () => void;
  onRestart: () => void;
  onExit: () => void;
  roomCode?: string;
  chatMessages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  myUid?: string;
  restartRequestedByMe?: boolean;
}

export const GameArena: React.FC<GameArenaProps> = ({
  mode,
  aiDifficulty,
  onChangeAIDifficulty,
  playerXName,
  playerOName,
  scoreX,
  scoreO,
  currentTurn,
  mySymbol,
  board,
  winningLine,
  isGameOver,
  onCellClick,
  onUndo,
  onRestart,
  onExit,
  roomCode,
  chatMessages = [],
  onSendMessage,
  myUid,
  restartRequestedByMe
}) => {
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCellClick = (idx: number) => {
    if (isGameOver || board[idx] !== null) return;
    if (mode === 'online' && mySymbol && currentTurn !== mySymbol) return;
    haptics.trigger(30);
    onCellClick(idx);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !onSendMessage) return;
    onSendMessage(chatText.trim());
    setChatText('');
  };

  const sendQuickEmoji = (emoji: string) => {
    if (onSendMessage) {
      onSendMessage(emoji);
    }
  };

  const isMyTurn = mode !== 'online' || !mySymbol || currentTurn === mySymbol;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto gap-4 animate-in fade-in duration-200">
      {/* Scoreboard HUD */}
      <div
        className="w-full rounded-2xl border p-3 flex items-center justify-between shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Player X */}
        <div className={`flex flex-col items-center flex-1 transition-transform ${currentTurn === 'X' && !isGameOver ? 'scale-105' : 'opacity-80'}`}>
          <span className="text-xs font-bold max-w-[90px] truncate" style={{ color: 'var(--text-main)' }}>
            {playerXName} {mode === 'online' && mySymbol === 'X' ? '(You)' : ''}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-extrabold text-lg my-1 border-2"
            style={{
              borderColor: 'var(--player-x)',
              color: 'var(--player-x)',
              backgroundColor: currentTurn === 'X' && !isGameOver ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
            }}
          >
            X
          </div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--text-muted)' }}>
            {scoreX}
          </span>
        </div>

        {/* Turn Pill */}
        <div className="flex flex-col items-center px-2">
          <div
            className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase font-display border shadow-sm transition-all"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-accent)',
              color: currentTurn === 'X' ? 'var(--player-x)' : 'var(--player-o)'
            }}
          >
            {isGameOver
              ? 'MATCH OVER'
              : mode === 'online'
              ? isMyTurn
                ? 'YOUR TURN'
                : "OPPONENT'S TURN"
              : `${currentTurn} TURN`}
          </div>
          {roomCode && (
            <span className="text-[10px] font-mono font-bold mt-1 text-slate-400">
              ROOM: {roomCode}
            </span>
          )}
        </div>

        {/* Player O */}
        <div className={`flex flex-col items-center flex-1 transition-transform ${currentTurn === 'O' && !isGameOver ? 'scale-105' : 'opacity-80'}`}>
          <span className="text-xs font-bold max-w-[90px] truncate" style={{ color: 'var(--text-main)' }}>
            {playerOName} {mode === 'online' && mySymbol === 'O' ? '(You)' : ''}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-extrabold text-lg my-1 border-2"
            style={{
              borderColor: 'var(--player-o)',
              color: 'var(--player-o)',
              backgroundColor: currentTurn === 'O' && !isGameOver ? 'rgba(14, 165, 233, 0.15)' : 'transparent'
            }}
          >
            O
          </div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--text-muted)' }}>
            {scoreO}
          </span>
        </div>
      </div>

      {/* AI Difficulty Selector (Single player only) */}
      {mode === 'computer' && (
        <div
          className="w-full flex rounded-xl border p-1"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          {(['easy', 'classic', 'hard'] as AIDifficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => {
                sound.playClick();
                onChangeAIDifficulty(diff);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                aiDifficulty === diff
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {diff === 'hard' ? 'Hard (Minimax)' : diff}
            </button>
          ))}
        </div>
      )}

      {/* Tic Tac Toe 3x3 Board */}
      <div
        className="w-[min(88vw,340px)] h-[min(88vw,340px)] grid grid-cols-3 grid-rows-3 gap-2.5 p-2.5 rounded-3xl border shadow-xl relative"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {board.map((cell, idx) => {
          const isWinningCell = winningLine.includes(idx);
          const isClickable = !isGameOver && cell === null && (mode !== 'online' || isMyTurn);

          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={!isClickable}
              className={`rounded-2xl border flex items-center justify-center font-display font-black text-5xl sm:text-6xl select-none transition-all duration-150 ${
                isClickable
                  ? 'cursor-pointer active:scale-95 hover:bg-[var(--bg-surface-elevated)]'
                  : 'cursor-default'
              } ${isWinningCell ? 'win-pulse' : ''}`}
              style={{
                backgroundColor: isWinningCell
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'var(--bg-surface)',
                borderColor: isWinningCell ? 'var(--success)' : 'var(--border-subtle)',
                color: cell === 'X' ? 'var(--player-x)' : 'var(--player-o)'
              }}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Action Buttons Row */}
      <div className="w-full flex items-center gap-2">
        {mode !== 'online' && (
          <button
            onClick={() => {
              sound.playClick();
              onUndo();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            <span>↩</span>
            <span>Undo</span>
          </button>
        )}

        <button
          onClick={() => {
            sound.playClick();
            onRestart();
          }}
          className="flex-1 py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
          style={{
            backgroundColor: 'var(--accent-primary)'
          }}
        >
          <span>🔄</span>
          <span>{restartRequestedByMe ? 'Waiting...' : 'Restart'}</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onExit();
          }}
          className="py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-transform active:scale-95"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--danger)'
          }}
        >
          Exit
        </button>
      </div>

      {/* Online Chat & Reactions Bar */}
      {mode === 'online' && (
        <div
          className="w-full rounded-2xl border flex flex-col overflow-hidden shadow-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          {/* Quick reactions strip */}
          <div className="flex items-center justify-around p-1.5 border-b text-base" style={{ borderColor: 'var(--border-subtle)' }}>
            {['🔥', '👏', '😮', '🤝', '😂', '💀', '👑'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendQuickEmoji(emoji)}
                className="hover:scale-125 transition-transform active:scale-95 p-1"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="h-32 p-2.5 overflow-y-auto flex flex-col gap-1.5 text-xs">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 my-auto text-[11px]">
                Match chat is active. Send a message or reaction!
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const isMine = msg.senderUid === myUid;
                return (
                  <div
                    key={msg.id || i}
                    className={`flex flex-col max-w-[80%] rounded-xl px-2.5 py-1.5 break-words ${
                      isMine
                        ? 'self-end bg-[var(--accent-primary)] text-white rounded-br-xs'
                        : 'self-start bg-[var(--bg-surface-elevated)] border rounded-bl-xs'
                    }`}
                    style={!isMine ? { borderColor: 'var(--border-subtle)', color: 'var(--text-main)' } : {}}
                  >
                    {!isMine && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {msg.senderName}
                      </span>
                    )}
                    <span className="text-xs">{msg.text}</span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendChat} className="flex border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Type in match chat..."
              maxLength={150}
              className="flex-1 px-3 py-2 text-xs bg-transparent outline-none"
              style={{ color: 'var(--text-main)' }}
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

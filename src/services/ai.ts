import { Board, Player } from '../types/game';

export interface WinOutcome {
  winner: Player | 'draw';
  line: number[];
}

export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWinner(board: Board): WinOutcome | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a]!, line: [a, b, c] };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: [] };
  }
  return null;
}

export function getAvailableMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

export function getAIMove(board: Board, difficulty: 'easy' | 'classic' | 'hard', aiSymbol: Player = 'O', humanSymbol: Player = 'X'): number {
  const available = getAvailableMoves(board);
  if (available.length === 0) return -1;

  if (difficulty === 'easy') {
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === 'classic') {
    // 1. Can AI win right now?
    for (const move of available) {
      const test = [...board];
      test[move] = aiSymbol;
      if (checkWinner(test)?.winner === aiSymbol) return move;
    }
    // 2. Can Human win right now? Block!
    for (const move of available) {
      const test = [...board];
      test[move] = humanSymbol;
      if (checkWinner(test)?.winner === humanSymbol) return move;
    }
    // 3. Center
    if (available.includes(4)) return 4;
    // 4. Corners
    const corners = [0, 2, 6, 8].filter(c => available.includes(c));
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  // Hard (Minimax with alpha-beta pruning)
  if (available.length === 9) return 4; // Center is best first move
  if (available.length === 8 && available.includes(4)) return 4;

  let bestScore = -Infinity;
  let bestMove = available[0];

  for (const move of available) {
    board[move] = aiSymbol;
    const score = minimax(board, 0, false, -Infinity, Infinity, aiSymbol, humanSymbol);
    board[move] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiSymbol: Player,
  humanSymbol: Player
): number {
  const outcome = checkWinner(board);
  if (outcome) {
    if (outcome.winner === aiSymbol) return 10 - depth;
    if (outcome.winner === humanSymbol) return depth - 10;
    if (outcome.winner === 'draw') return 0;
  }

  const available = getAvailableMoves(board);
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of available) {
      board[move] = aiSymbol;
      const evaluation = minimax(board, depth + 1, false, alpha, beta, aiSymbol, humanSymbol);
      board[move] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of available) {
      board[move] = humanSymbol;
      const evaluation = minimax(board, depth + 1, true, alpha, beta, aiSymbol, humanSymbol);
      board[move] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

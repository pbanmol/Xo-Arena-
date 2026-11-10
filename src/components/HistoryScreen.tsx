import React from 'react';
import { MatchRecord } from '../types/game';
import { sound } from '../services/sound';

interface HistoryScreenProps {
  history: MatchRecord[];
  onClearHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onClearHistory
}) => {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div
        className="rounded-2xl border p-4.5 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
              Match History
            </h3>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                sound.playClick();
                onClearHistory();
              }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {history.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No match history recorded yet. Play a game to record results!
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                    vs {record.opponent} ({record.mode})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {record.date} • {record.moves} moves
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-display tracking-wider ${
                    record.result === 'Win'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : record.result === 'Loss'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  }`}
                >
                  {record.result}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

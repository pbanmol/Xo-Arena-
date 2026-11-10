import React from 'react';
import { DirectChallenge } from '../types/game';
import { sound } from '../services/sound';

interface ChallengeModalProps {
  challenge: DirectChallenge | null;
  onAccept: (challenge: DirectChallenge) => void;
  onDecline: (challenge: DirectChallenge) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challenge,
  onAccept,
  onDecline
}) => {
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-3xl border p-6 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-3xl mb-3 shadow-inner">
          {challenge.senderAvatarEmoji || '⚔️'}
        </div>

        <h3 className="font-display font-black text-xl tracking-wider" style={{ color: 'var(--text-main)' }}>
          Arena Challenge!
        </h3>

        <p className="text-xs mt-2 mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <strong className="text-[var(--text-main)] text-sm">{challenge.senderName}</strong>
          <br />
          <span className="font-mono font-bold text-[var(--accent-primary)] text-[11px]">
            XO ARENA UID: {challenge.senderNumericUid || 1}
          </span>
          <br />
          <span className="text-slate-400">has challenged you to a 1v1 battle!</span>
        </p>

        <div className="flex w-full gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onAccept(challenge);
            }}
            className="flex-1 py-3 rounded-xl text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--success)' }}
          >
            Accept Match
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onDecline(challenge);
            }}
            className="flex-1 py-3 rounded-xl border text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--danger)'
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

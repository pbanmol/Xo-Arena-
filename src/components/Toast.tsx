import React from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-11/12 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto cursor-pointer px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-2.5 text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-top-2 ${
            t.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-100'
          }`}
        >
          <span className="text-base">
            {t.type === 'error' ? '⚠️' : t.type === 'success' ? '✨' : '💬'}
          </span>
          <span className="flex-1 text-xs sm:text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
};

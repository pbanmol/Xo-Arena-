import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected application error'
    };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('XO_ARENA_')) localStorage.removeItem(key);
      });
    } catch {
      // ignore storage access issues
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
          style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl border p-6 shadow-xl flex flex-col items-center gap-3"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="text-4xl">⚠️</div>
            <h2 className="font-display font-black text-xl tracking-wide">XO ARENA</h2>
            <p className="text-xs text-slate-400">
              Something interrupted startup. Tap below to reload cleanly.
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 rounded-xl text-white font-bold text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Reload App
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 rounded-xl border text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              >
                Reset Local Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

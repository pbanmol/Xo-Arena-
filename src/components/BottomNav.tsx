import React from 'react';
import { TabScreen } from '../types/game';
import { sound } from '../services/sound';

interface BottomNavProps {
  activeTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
  onlinePlayerCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onlinePlayerCount
}) => {
  const tabs: { id: TabScreen; label: string; icon: string; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'online', label: 'Online', icon: '⚡', badge: onlinePlayerCount },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'ranks', label: 'Ranks', icon: '🏆' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-1.5 pt-1"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--nav-border)',
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              sound.playClick();
              onTabChange(tab.id);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-14 relative transition-colors cursor-pointer ${
              isActive ? 'font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="text-xl leading-none">{tab.icon}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-medium leading-none">
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0.5 w-6 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

import { AppTheme } from '../types/game';

export interface SystemBarPalette {
  statusBarColor: string;
  navBarColor: string;
  bgBase: string;
  isDarkBars: boolean;
}

declare global {
  interface Window {
    AndroidTheme?: {
      setSystemBars: (
        statusColor: string,
        navColor: string,
        bgBase: string,
        isDarkBars: boolean
      ) => void;
    };
  }
}

export function getSystemBarPalette(theme: AppTheme, isDark: boolean): SystemBarPalette {
  if (theme === 'neon') {
    return {
      statusBarColor: '#0f0724',
      navBarColor: '#0f0724',
      bgBase: '#090514',
      isDarkBars: true
    };
  }

  if (theme === 'black') {
    return {
      statusBarColor: '#09090b',
      navBarColor: '#09090b',
      bgBase: '#050505',
      isDarkBars: true
    };
  }

  if (isDark) {
    switch (theme) {
      case 'ocean':
        return {
          statusBarColor: '#082032',
          navBarColor: '#082032',
          bgBase: '#061624',
          isDarkBars: true
        };
      case 'emerald':
        return {
          statusBarColor: '#05231b',
          navBarColor: '#05231b',
          bgBase: '#041a14',
          isDarkBars: true
        };
      case 'crimson':
        return {
          statusBarColor: '#260914',
          navBarColor: '#260914',
          bgBase: '#1a060e',
          isDarkBars: true
        };
      case 'light':
      default:
        return {
          statusBarColor: '#0f172a',
          navBarColor: '#0f172a',
          bgBase: '#0b0f19',
          isDarkBars: true
        };
    }
  }

  // Light themes
  switch (theme) {
    case 'ocean':
      return {
        statusBarColor: '#e0f2fe',
        navBarColor: '#e0f2fe',
        bgBase: '#f0f9ff',
        isDarkBars: false
      };
    case 'emerald':
      return {
        statusBarColor: '#dcfce7',
        navBarColor: '#dcfce7',
        bgBase: '#f0fdf4',
        isDarkBars: false
      };
    case 'crimson':
      return {
        statusBarColor: '#ffe4e6',
        navBarColor: '#ffe4e6',
        bgBase: '#fff1f2',
        isDarkBars: false
      };
    case 'light':
    default:
      return {
        statusBarColor: '#ffffff',
        navBarColor: '#ffffff',
        bgBase: '#f8fafc',
        isDarkBars: false
      };
  }
}

export function applySystemBarsTheme(theme: AppTheme, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const palette = getSystemBarPalette(theme, isDark);

  // 1. Update HTML/Safari theme-color meta tag (iPhone Safari + Android Chrome)
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', palette.statusBarColor);

  // 2. Update iOS Web App status bar style
  let appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusMeta) {
    appleStatusMeta = document.createElement('meta');
    appleStatusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleStatusMeta);
  }
  appleStatusMeta.setAttribute('content', palette.isDarkBars ? 'black-translucent' : 'default');

  // 3. Sync root colorScheme & background so iOS overscroll & safe areas match theme
  document.documentElement.style.colorScheme = palette.isDarkBars ? 'dark' : 'light';
  document.documentElement.style.backgroundColor = palette.bgBase;

  // 4. Sync native Android Status Bar + Navigation Bar + Icon Contrast via WebView bridge
  try {
    if (typeof window !== 'undefined' && window.AndroidTheme?.setSystemBars) {
      window.AndroidTheme.setSystemBars(
        palette.statusBarColor,
        palette.navBarColor,
        palette.bgBase,
        palette.isDarkBars
      );
    }
  } catch {
    // Ignore when running outside Android WebView
  }
}

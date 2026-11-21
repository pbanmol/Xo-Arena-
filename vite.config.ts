import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

function stripChatScreenshotsFromBuild() {
  return {
    name: 'strip-chat-screenshots',
    closeBundle() {
      const target = path.resolve(import.meta.dirname, 'dist/assets/aistudio');
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), stripChatScreenshotsFromBuild()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true as const,
      hmr: false,
      watch: {
        ignored: [
          '**/android/**',
          '**/ios/**',
          '**/.gradle/**',
          '**/gradle/**',
          '**/dist/**',
          '**/public/assets/aistudio/**',
        ],
      },
      warmup: {
        clientFiles: ['./index.html', './src/main.tsx'],
      },
    },
  };
});

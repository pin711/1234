
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 確保 GitHub Pages 子目錄路徑正確
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.FIREBASE_CONFIG': JSON.stringify(process.env.FIREBASE_CONFIG || '{}'),
  },
  build: {
    minify: 'terser', // 使用 terser 確保生產環境編譯成功且代碼最小化
    terserOptions: {
      compress: {
        drop_console: true, // 生產環境移除 console
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          ai: ['@google/genai']
        }
      }
    }
  }
});

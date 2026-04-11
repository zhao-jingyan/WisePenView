import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['local.wisepen.oriole.cn'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@services-registry': path.resolve(
        __dirname,
        mode === 'mock'
          ? './src/contexts/ServicesContext/registry.mock.ts'
          : './src/contexts/ServicesContext/registry.impl.ts'
      ),
    },
  },
}));

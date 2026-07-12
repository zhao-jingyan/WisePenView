import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const REQUIRED_CLIENT_URL_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_NOTE_COLLAB_WS_URL',
  'VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL',
] as const;
const OPTIONAL_CLIENT_URL_KEYS = ['VITE_DRAWIO_EMBED_URL'] as const;
const NO_TRAILING_SLASH_URL_KEYS = new Set<string>([
  'VITE_API_BASE_URL',
  'VITE_NOTE_COLLAB_WS_URL',
]);

function assertClientUrl(key: string, value: string, mode: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`[vite] ${key} 必须是绝对 URL。请检查 .env.${mode}`);
  }

  if (NO_TRAILING_SLASH_URL_KEYS.has(key) && value.endsWith('/')) {
    throw new Error(`[vite] ${key} 不能以 / 结尾。请检查 .env.${mode}`);
  }
}

export default defineConfig(({ mode }) => {
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  const servicesRegistry = env.SERVICES_REGISTRY;
  if (!servicesRegistry) {
    throw new Error(
      `[vite] 缺少 SERVICES_REGISTRY。请在 .env.${mode}（或 .env）中配置，指向 registry.impl.ts 或 registry.mock.ts`
    );
  }

  for (const key of REQUIRED_CLIENT_URL_KEYS) {
    const value = env[key];
    if (!value) {
      throw new Error(`[vite] 缺少 ${key}。请检查 .env.${mode}`);
    }
    assertClientUrl(key, value, mode);
  }

  for (const key of OPTIONAL_CLIENT_URL_KEYS) {
    const value = env[key];
    if (value) {
      assertClientUrl(key, value, mode);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: ['local.wisepen.oriole.cn'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@services-registry': path.resolve(__dirname, servicesRegistry),
      },
    },
  };
});

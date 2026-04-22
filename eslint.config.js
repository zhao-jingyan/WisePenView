import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-alert': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useEffect'],
              message:
                '项目约定禁止使用 useEffect，请改为事件驱动、显式回调或拆解为 ahooks 的 useMount、useUnmount、useUpdateEffect。',
            },
            {
              name: 'antd',
              importNames: ['message'],
              message:
                '项目约定禁止使用 antd message 静态方法，请改为 App.useApp() 或 useAppMessage() 返回的实例方法。',
            },
          ],
          patterns: [
            {
              group: [
                '@/services/*/*Services.impl',
                '@/services/*/*Services.impl.*',
                // 相对路径同样拦截，防止绕过 `@/` 别名
                '**/services/*/*Services.impl',
                '**/services/*/*Services.impl.*',
              ],
              importNamePattern: '^create[A-Z]\\w*Services$',
              message:
                '项目保留命名约定：createXxxServices 是 Service 工厂的专属符号，仅允许在装配入口 src/contexts/ServicesContext/registry.impl.ts 中 import；其它位置禁止直接导入或调用，业务代码请通过 useXxxService() 获取实例。',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'useEffect',
          message:
            '项目约定禁止使用 useEffect，请改为事件驱动、显式回调或拆解为 ahooks 的 useMount、useUnmount、useUpdateEffect。',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Modal'][callee.property.name=/^(confirm|info|success|error|warning)$/]",
          message: '项目约定禁止使用 Modal 静态方法，请改为受控 Antd <Modal /> 组件。',
        },
        {
          selector:
            "CallExpression[callee.object.name='modal'][callee.property.name=/^(confirm|info|success|error|warning)$/]",
          message: '项目约定禁止使用 modal 静态方法，请改为受控 Antd <Modal /> 组件。',
        },
        {
          selector: 'ExportAllDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
          message:
            '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/contexts/ServicesContext/registry.impl.ts 装配，index.ts 不得二次导出。',
        },
        {
          selector: 'ExportNamedDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
          message:
            '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/contexts/ServicesContext/registry.impl.ts 装配，index.ts 不得二次导出。',
        },
      ],
    },
  },
  {
    // 全局禁止 useEffect，只有统一封装入口允许直接调用原生 useEffect。
    // 请勿删除此白名单，否则 useEffectForce 无法工作。
    files: ['src/hooks/useEffectForce.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    // Service 工厂的唯一合法装配入口：只有 registry.impl.ts 可以 import createXxxServices。
    // 请勿扩大此白名单，否则"分层 + 显式注入"约束将被破坏。
    files: ['src/contexts/ServicesContext/registry.impl.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Mock 实现允许 console.log 作为调试路径
    files: ['src/mocks/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
]);

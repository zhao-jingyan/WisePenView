import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const reactUseEffectImportRule = {
  name: 'react',
  importNames: ['useEffect'],
  message:
    '项目约定禁止使用 useEffect，请改为事件驱动、显式回调或拆解为 ahooks 的 useMount、useUnmount、useUpdateEffect。',
};

const reactFcImportRule = {
  name: 'react',
  importNames: ['FC'],
  message: '项目约定组件使用普通函数声明，请不要使用 React.FC / FC。',
};

const antdMessageImportRule = {
  name: 'antd',
  importNames: ['message'],
  message: '项目已移除 Ant Design，请不要从 antd 导入 message。',
};

const directAxiosImportRule = {
  name: '@/apis/Axios',
  message:
    '禁止直接 import Axios，请通过 `@/apis/request` 调用；仅 `src/apis/request.ts` 允许直接使用。',
};

const directAxiosImportPattern = {
  group: ['**/apis/Axios'],
  message:
    '禁止直接 import Axios，请通过 `@/apis/request` 调用；仅 `src/apis/request.ts` 允许直接使用。',
};

const serviceFactoryImportPattern = {
  group: [
    '@/domains/*/service/*Services.impl',
    '@/domains/*/service/*Services.impl.*',
    // 相对路径同样拦截，防止绕过 `@/` 别名
    '**/service/*Services.impl',
    '**/service/*Services.impl.*',
    '**/domains/*/service/*Services.impl',
    '**/domains/*/service/*Services.impl.*',
  ],
  importNamePattern: '^create[A-Z]\\w*Services$',
  message:
    '项目保留命名约定：createXxxServices 是 Service 工厂的专属符号，仅允许在装配入口 src/domains/_registry/registry.impl.ts 中 import；其它位置禁止直接导入或调用，业务代码请通过 useXxxService() 获取实例。',
};

const autoGenImportPattern = {
  group: ['@/_autoGen/**', '**/_autoGen/**'],
  message:
    '后端生成类型只能在 src/domains/<Domain>/apis 中导入；Service、mapper、组件和页面应依赖领域类型或 API DTO。',
};

const apiRequestImportPattern = {
  group: ['@/apis/request', '**/apis/request'],
  message:
    'apiGet/apiPost/apiPut/apiDelete 只能在 src/domains/<Domain>/apis 中使用；其它层请通过 useXxxService() 或 service 编排调用。',
};

const domainApiFunctionImportPattern = {
  group: ['@/domains/*/apis/*Api', '**/domains/*/apis/*Api', '**/apis/*Api'],
  message:
    '领域 API 函数只能由 src/domains/<Domain>/service 调用；mapper、组件和页面只允许依赖领域类型或 API type。',
};

const buildRestrictedImportsRule = ({
  allowApiRequest = false,
  allowAutoGen = false,
  allowDirectAxios = false,
  allowDomainApiFunction = false,
  allowReactUseEffect = false,
  allowServiceFactory = false,
} = {}) => {
  const paths = [
    ...(allowReactUseEffect ? [] : [reactUseEffectImportRule]),
    reactFcImportRule,
    antdMessageImportRule,
    ...(allowDirectAxios ? [] : [directAxiosImportRule]),
  ];
  const patterns = [
    ...(allowDirectAxios ? [] : [directAxiosImportPattern]),
    ...(allowServiceFactory ? [] : [serviceFactoryImportPattern]),
    ...(allowAutoGen ? [] : [autoGenImportPattern]),
    ...(allowApiRequest ? [] : [apiRequestImportPattern]),
    ...(allowDomainApiFunction ? [] : [domainApiFunctionImportPattern]),
  ];

  return ['error', { paths, patterns }];
};

export default defineConfig([
  globalIgnores(['dist', 'src/components/_shadcn/**']),
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
      'no-restricted-imports': buildRestrictedImportsRule(),
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
            "TSTypeReference[typeName.type='TSQualifiedName'][typeName.left.name='React'][typeName.right.name='FC']",
          message: '项目约定组件使用普通函数声明，请不要使用 React.FC / FC。',
        },
        {
          selector: 'ExportAllDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
          message:
            '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.impl.ts 装配，index.ts 不得二次导出。',
        },
        {
          selector: 'ExportNamedDeclaration[source.value=/Services\\.impl(\\.[jt]sx?)?$/]',
          message:
            '禁止 re-export *Services.impl —— createXxxServices 工厂只能在 src/domains/_registry/registry.impl.ts 装配，index.ts 不得二次导出。',
        },
      ],
    },
  },
  {
    // 全局禁止 useEffect，只有统一封装入口允许直接调用原生 useEffect。
    // 请勿删除此白名单，否则 useEffectForce 无法工作。
    files: ['src/hooks/useEffectForce.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowReactUseEffect: true }),
      'no-restricted-properties': 'off',
    },
  },
  {
    // Domain API 层是唯一允许读取 OpenAPI 生成类型、调用 apiGet/apiPost/apiPut/apiDelete 的业务层。
    files: ['src/domains/*/apis/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowApiRequest: true,
        allowAutoGen: true,
      }),
    },
  },
  {
    // Service 层是唯一允许调用领域 API 函数的业务层。
    files: ['src/domains/*/service/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainApiFunction: true,
      }),
    },
  },
  {
    // Service 工厂的唯一合法装配入口：只有 registry.impl.ts 可以 import createXxxServices。
    // 请勿扩大此白名单，否则"分层 + 显式注入"约束将被破坏。
    files: ['src/domains/_registry/registry.impl.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowServiceFactory: true }),
    },
  },
  {
    // API 运行时是唯一允许直连 Axios 的入口。
    files: ['src/apis/request.ts'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({ allowDirectAxios: true }),
    },
  },
  {
    // Mock 实现允许 console.log 作为调试路径
    files: ['src/domains/*/mock/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
]);

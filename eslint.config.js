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

const domainMapperImportPattern = {
  group: [
    '@/domains/*/mapper/**',
    '**/domains/*/mapper/**',
    '../mapper/**',
    './mapper/**',
    '**/mapper/**',
  ],
  message:
    'Mapper 是 domain 内部协议转换边界，只能由同 domain 的 service/mock/mapper 使用；组件、页面和公共出口请依赖 service 返回类型、entity 或组件本地 helper。',
};

const normalizeLintPath = (value) => value.replaceAll('\\', '/');

const getServiceFileInfo = (filename) => {
  const normalized = normalizeLintPath(filename);
  const match = normalized.match(
    /(^|\/)src\/domains\/([^/]+)\/service\/([^/]+Services)\.(impl|helper)\.[jt]sx?$/
  );
  if (!match) return null;
  return {
    domain: match[2],
    serviceName: match[3],
    kind: match[4],
  };
};

const isServiceHelperImport = (source) => /(^|\/)[^/]+Services\.helper(\.[jt]sx?)?$/.test(source);

const isForbiddenServiceHelperDependency = (source) => {
  if (source === '@/store' || source.startsWith('@/store/')) return true;
  if (source.includes('/store/')) return true;
  if (source.startsWith('@/domains/_registry') || source.includes('/domains/_registry/')) {
    return true;
  }
  if (/(^|\/)apis\/[^/]*Api(\.[jt]sx?)?$/.test(source)) return true;
  if (/(^|\/)[^/]+Services\.(impl|mock|helper)(\.[jt]sx?)?$/.test(source)) return true;
  return false;
};

const wisepenRules = {
  'service-helper-boundary': {
    meta: {
      type: 'problem',
      messages: {
        helperImport:
          'Service helper 只能由同目录同名 *Services.impl.ts 通过 ./XxxServices.helper 相邻导入；跨领域复用请提升到 mapper、normalizer、utils 或 _shared。',
        helperDependency:
          'Service helper 只放私有纯业务规则，禁止直接 import API、store、registry、其它 service 实现或其它 service helper。',
      },
    },
    create(context) {
      const currentFile = context.filename ?? context.getFilename();
      const currentInfo = getServiceFileInfo(currentFile);

      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== 'string') return;

          if (isServiceHelperImport(source)) {
            const expectedSource =
              currentInfo?.kind === 'impl' ? `./${currentInfo.serviceName}.helper` : null;
            const isAllowed =
              expectedSource != null &&
              (source === expectedSource || source === `${expectedSource}.ts`);
            if (!isAllowed) {
              context.report({ node, messageId: 'helperImport' });
            }
          }

          if (currentInfo?.kind === 'helper' && isForbiddenServiceHelperDependency(source)) {
            context.report({ node, messageId: 'helperDependency' });
          }
        },
      };
    },
  },
};

const buildRestrictedImportsRule = ({
  allowApiRequest = false,
  allowDirectAxios = false,
  allowDomainApiFunction = false,
  allowDomainMapper = false,
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
    ...(allowApiRequest ? [] : [apiRequestImportPattern]),
    ...(allowDomainApiFunction ? [] : [domainApiFunctionImportPattern]),
    ...(allowDomainMapper ? [] : [domainMapperImportPattern]),
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
    plugins: {
      wisepen: {
        rules: wisepenRules,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-alert': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'wisepen/service-helper-boundary': 'error',
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
        {
          selector: 'ExportAllDeclaration[source.value=/\\/mapper\\//]',
          message:
            '禁止 re-export mapper —— mapper 只能在 domain 内部由 service/mock/mapper 使用，公共出口请暴露稳定 entity、service 类型或组件真正需要的领域 helper。',
        },
        {
          selector: 'ExportNamedDeclaration[exportKind!="type"][source.value=/\\/mapper\\//]',
          message:
            '禁止 re-export mapper —— mapper 只能在 domain 内部由 service/mock/mapper 使用，公共出口请暴露稳定 entity、service 类型或组件真正需要的领域 helper。',
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
    // Domain API 层是唯一允许调用 apiGet/apiPost/apiPut/apiDelete 的业务层。
    files: ['src/domains/*/apis/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowApiRequest: true,
      }),
    },
  },
  {
    // Service 层是唯一允许调用领域 API 函数的业务层。
    files: ['src/domains/*/service/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainApiFunction: true,
        allowDomainMapper: true,
      }),
    },
  },
  {
    // Mapper 内部允许组合相邻 mapper，但 mapper 不应从公共出口暴露给组件或页面。
    files: ['src/domains/*/mapper/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainMapper: true,
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
      'no-restricted-imports': buildRestrictedImportsRule({
        allowDomainMapper: true,
      }),
    },
  },
]);

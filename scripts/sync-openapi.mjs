import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOCS_URL = process.env.OPENAPI_DOCS_URL ?? 'http://test.api.fudan.wisepen.oriole.cn/docs';
const OPENAPI_TS_VERSION = '0.98.1';
const AUTO_GEN_DIR = path.resolve('src/_autoGen');
const API_DIR = path.join(AUTO_GEN_DIR, 'api');
const ENUM_DIR = path.join(AUTO_GEN_DIR, 'enum');
const OPENAPI_DIR = path.join(AUTO_GEN_DIR, 'openapi');
const CONFIG_PATH = path.join(OPENAPI_DIR, 'openapi-ts.config.mjs');
const EXCLUDED_PATH_PREFIXES = ['/internal'];

const toNamespace = (slug) => slug.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败：${url} (${response.status})`);
  }
  return response.json();
};

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败：${url} (${response.status})`);
  }
  return response.text();
};

const readScalarSources = async () => {
  const html = await fetchText(DOCS_URL);
  const match = html.match(/Scalar\.createApiReference\('#app',\s*(\{[\s\S]*?\})\s*\)/);
  if (!match) {
    throw new Error('未能从 Scalar 文档页解析 OpenAPI sources');
  }
  const config = JSON.parse(match[1]);
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error('Scalar 配置中没有发现 sources');
  }
  return config.sources.map((source) => ({
    ...source,
    url: new URL(source.url, DOCS_URL).toString(),
  }));
};

const collectOperationDiagnostics = (sources) => {
  const seen = new Map();
  const missing = [];
  const duplicated = [];

  for (const source of sources) {
    for (const [apiPath, methods] of Object.entries(source.spec.paths ?? {})) {
      for (const [method, operation] of Object.entries(methods ?? {})) {
        const operationId = operation?.operationId;
        const location = `${source.slug}:${method.toUpperCase()} ${apiPath}`;
        if (!operationId) {
          missing.push(location);
          continue;
        }
        const previous = seen.get(operationId);
        if (previous) {
          duplicated.push({ operationId, locations: [previous, location] });
        } else {
          seen.set(operationId, location);
        }
      }
    }
  }

  return { duplicated, missing };
};

const printOperationDiagnostics = (diagnostics) => {
  if (diagnostics.missing.length > 0) {
    console.warn(`缺少 operationId 的接口：${diagnostics.missing.length}`);
    diagnostics.missing.forEach((item) => console.warn(`  - ${item}`));
  }
  if (diagnostics.duplicated.length > 0) {
    console.warn(`重复 operationId：${diagnostics.duplicated.length}`);
    diagnostics.duplicated.forEach((item) => {
      console.warn(`  - ${item.operationId}: ${item.locations.join(' / ')}`);
    });
  }
};

const shouldExcludePath = (apiPath) =>
  EXCLUDED_PATH_PREFIXES.some((prefix) => apiPath === prefix || apiPath.startsWith(`${prefix}/`));

const collectRefs = (value, refs = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
    return refs;
  }
  if (!value || typeof value !== 'object') {
    return refs;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') {
      const match = item.match(/^#\/components\/schemas\/(.+)$/);
      if (match) refs.add(match[1]);
      continue;
    }
    collectRefs(item, refs);
  }
  return refs;
};

const collectSecuritySchemeNames = (paths) => {
  const names = new Set();
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem ?? {})) {
      for (const securityItem of operation?.security ?? []) {
        Object.keys(securityItem).forEach((name) => names.add(name));
      }
    }
  }
  return names;
};

const collectReachableSchemas = (paths, schemas) => {
  const reachable = collectRefs(paths);
  const queue = [...reachable];

  while (queue.length > 0) {
    const schemaName = queue.shift();
    const schema = schemas?.[schemaName];
    if (!schema) continue;
    const refs = collectRefs(schema);
    for (const ref of refs) {
      if (!reachable.has(ref)) {
        reachable.add(ref);
        queue.push(ref);
      }
    }
  }

  return reachable;
};

const sanitizeSpec = (spec) => {
  const paths = {};
  let excludedPathCount = 0;

  for (const [apiPath, pathItem] of Object.entries(spec.paths ?? {})) {
    if (shouldExcludePath(apiPath)) {
      excludedPathCount += 1;
      continue;
    }
    paths[apiPath] = pathItem;
  }

  const schemas = spec.components?.schemas ?? {};
  const reachableSchemas = collectReachableSchemas(paths, schemas);
  const nextSchemas = Object.fromEntries(
    Object.entries(schemas).filter(([schemaName]) => reachableSchemas.has(schemaName))
  );

  const securitySchemes = spec.components?.securitySchemes ?? {};
  const usedSecuritySchemes = collectSecuritySchemeNames(paths);
  const nextSecuritySchemes = Object.fromEntries(
    Object.entries(securitySchemes).filter(([name]) => usedSecuritySchemes.has(name))
  );

  return {
    excludedPathCount,
    spec: {
      ...spec,
      paths,
      components: {
        ...(spec.components ?? {}),
        schemas: nextSchemas,
        securitySchemes: nextSecuritySchemes,
      },
    },
  };
};

const buildGeneratorConfig = (sources) =>
  sources.map((source) => ({
    input: path.join('src/_autoGen/openapi', `${source.slug}.openapi.json`),
    output: path.join('src/_autoGen/api', source.slug),
    parser: {
      transforms: {
        enums: 'root',
      },
    },
    plugins: [
      {
        enums: 'javascript',
        name: '@hey-api/typescript',
      },
    ],
  }));

const runOpenApiGenerator = () => {
  if (existsSync(path.resolve('node_modules/.bin/openapi-ts'))) {
    execFileSync('pnpm', ['exec', 'openapi-ts', '-f', CONFIG_PATH, '--no-log-file'], {
      stdio: 'inherit',
    });
    return;
  }
  execFileSync('pnpm', ['dlx', `@hey-api/openapi-ts@${OPENAPI_TS_VERSION}`, '-f', CONFIG_PATH, '--no-log-file'], {
    stdio: 'inherit',
  });
};

const isEnumSchema = (schema) => Array.isArray(schema?.enum);

const collectEnumDescriptions = (source) => {
  const rows = [];
  for (const [schemaName, schema] of Object.entries(source.spec.components?.schemas ?? {})) {
    if (!isEnumSchema(schema)) continue;
    rows.push({
      descriptions:
        schema['x-enum-descriptions'] ??
        schema['x-enumDescriptions'] ??
        schema['x-enum-varnames'] ??
        schema['x-enumVarnames'] ??
        [],
      enumName: `${schemaName}Enum`,
      name: `${schemaName}EnumDescriptions`,
    });
  }
  return rows;
};

const collectGeneratedEnumNames = async (source) => {
  const typesPath = path.join(API_DIR, source.slug, 'types.gen.ts');
  const content = await readFile(typesPath, 'utf8');
  return [...content.matchAll(/^export const ([A-Za-z0-9_]+Enum)\b/gm)].map((match) => match[1]);
};

const writeEnumFile = async (source) => {
  const enumNames = await collectGeneratedEnumNames(source);
  const rows = collectEnumDescriptions(source);
  const body = [
    '// This file is auto-generated by scripts/sync-openapi.mjs',
    '',
    enumNames.length > 0
      ? `export {\n${enumNames.map((name) => `  ${name},`).join('\n')}\n} from '../api/${source.slug}/types.gen';`
      : '',
    enumNames.length > 0 ? '' : '',
    ...rows.flatMap((row) => [
      `export const ${row.name} = ${JSON.stringify(row.descriptions)} as const;`,
      '',
    ]),
    'export const enumDescriptionMap = {',
    ...rows.map((row) => `  ${row.enumName}: ${row.name},`),
    '} as const;',
    '',
  ].join('\n');
  await writeFile(path.join(ENUM_DIR, `${source.slug}.gen.ts`), body);
};

const writeIndexFiles = async (sources) => {
  await writeFile(
    path.join(API_DIR, 'index.ts'),
    [
      '// This file is auto-generated by scripts/sync-openapi.mjs',
      '',
      ...sources.map((source) => `export * as ${toNamespace(source.slug)}Api from './${source.slug}';`),
      '',
    ].join('\n')
  );
  await writeFile(
    path.join(ENUM_DIR, 'index.ts'),
    [
      '// This file is auto-generated by scripts/sync-openapi.mjs',
      '',
      ...sources.map((source) => `export * as ${toNamespace(source.slug)}Enums from './${source.slug}.gen';`),
      '',
    ].join('\n')
  );
};

const main = async () => {
  const scalarSources = await readScalarSources();
  const sources = await Promise.all(
    scalarSources.map(async (source) => {
      const rawSpec = await fetchJson(source.url);
      const sanitized = sanitizeSpec(rawSpec);
      if (sanitized.excludedPathCount > 0) {
        console.warn(`${source.slug}: 已过滤 internal 接口 ${sanitized.excludedPathCount} 个`);
      }
      return {
        ...source,
        spec: sanitized.spec,
      };
    })
  );

  printOperationDiagnostics(collectOperationDiagnostics(sources));

  await rm(AUTO_GEN_DIR, { force: true, recursive: true });
  await mkdir(API_DIR, { recursive: true });
  await mkdir(ENUM_DIR, { recursive: true });
  await mkdir(OPENAPI_DIR, { recursive: true });

  await Promise.all(
    sources.map((source) =>
      writeFile(path.join(OPENAPI_DIR, `${source.slug}.openapi.json`), JSON.stringify(source.spec, null, 2))
    )
  );
  await writeFile(CONFIG_PATH, `export default ${JSON.stringify(buildGeneratorConfig(sources), null, 2)};\n`);

  runOpenApiGenerator();

  await Promise.all(sources.map((source) => writeEnumFile(source)));
  await writeIndexFiles(sources);
  await writeFile(
    path.join(AUTO_GEN_DIR, 'README.md'),
    [
      '# _autoGen',
      '',
      '这里的文件由 `pnpm openapi:sync` 自动生成，请不要手动修改。',
      '',
      '目录按 Scalar source / 后端微服务拆分，业务代码优先从对应服务目录导入类型。',
      '',
    ].join('\n')
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import JSZip from 'jszip';

export interface ParsedSkillZipFile {
  name: string;
  path: string;
  content?: string;
  contentBlob: Blob;
  size: number;
}

export interface ParseSkillZipOptions {
  mainSkillFileName: string;
}

interface ZipEntryCandidate {
  entryPath: string;
  file: JSZip.JSZipObject;
}

const ROOT_PATH = '/';
const SKIPPED_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);
const MACOSX_RESOURCE_PREFIX = '__MACOSX/';
const TEXT_FILE_EXTENSIONS = new Set([
  'md',
  'py',
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'less',
  'html',
  'xml',
  'sh',
  'ps1',
  'bat',
  'cmd',
  'ini',
  'env',
  'gitignore',
  'dockerfile',
  'bash',
  'zsh',
]);

function normalizeZipPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) throw new Error('压缩包中存在空路径文件');
  if (trimmed.includes('\\')) throw new Error(`压缩包路径不支持反斜杠：${rawPath}`);

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  if (!withoutLeadingSlash || withoutLeadingSlash.endsWith('/')) {
    throw new Error(`压缩包路径不合法：${rawPath}`);
  }

  const parts = withoutLeadingSlash.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`压缩包路径不安全：${rawPath}`);
  }
  return withoutLeadingSlash;
}

function shouldSkipZipEntry(path: string): boolean {
  if (path.startsWith(MACOSX_RESOURCE_PREFIX)) return true;
  const name = path.split('/').pop() ?? '';
  return SKIPPED_FILE_NAMES.has(name);
}

function stripSingleTopFolder(entries: ZipEntryCandidate[], mainSkillFileName: string) {
  if (entries.some((entry) => entry.entryPath === mainSkillFileName)) return entries;

  const topFolders = new Set<string>();
  for (const entry of entries) {
    const slashIndex = entry.entryPath.indexOf('/');
    if (slashIndex <= 0) return entries;
    const topFolder = entry.entryPath.slice(0, slashIndex);
    const rest = entry.entryPath.slice(slashIndex + 1);
    if (!topFolder || !rest) return entries;
    topFolders.add(topFolder);
  }

  if (topFolders.size !== 1) return entries;
  const [topFolder] = [...topFolders];
  return entries.map((entry) => ({
    ...entry,
    entryPath: entry.entryPath.slice(topFolder.length + 1),
  }));
}

function validateZipEntries(entries: ZipEntryCandidate[], options: ParseSkillZipOptions) {
  if (entries.length === 0) {
    throw new Error('skill.zip 中没有可导入的文件');
  }

  const duplicatedPaths = new Set<string>();
  const seenPaths = new Set<string>();
  for (const entry of entries) {
    if (seenPaths.has(entry.entryPath)) duplicatedPaths.add(entry.entryPath);
    seenPaths.add(entry.entryPath);
  }

  if (duplicatedPaths.size > 0) {
    throw new Error(`zip 压缩包中存在重复文件：${[...duplicatedPaths].slice(0, 3).join('、')}`);
  }
  if (!entries.some((entry) => entry.entryPath === options.mainSkillFileName)) {
    throw new Error(`zip 压缩包根目录必须包含大写的 ${options.mainSkillFileName}`);
  }
}

function resolveParsedPath(entryPath: string): Pick<ParsedSkillZipFile, 'name' | 'path'> {
  const slashIndex = entryPath.lastIndexOf('/');
  if (slashIndex < 0) return { name: entryPath, path: ROOT_PATH };
  return {
    name: entryPath.slice(slashIndex + 1),
    path: `${ROOT_PATH}${entryPath.slice(0, slashIndex)}`,
  };
}

function isTextLikeFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return TEXT_FILE_EXTENSIONS.has(name.toLowerCase());
  return TEXT_FILE_EXTENSIONS.has(ext);
}

export async function parseSkillZip(
  zipFile: File,
  options: ParseSkillZipOptions
): Promise<ParsedSkillZipFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const candidates: ZipEntryCandidate[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const entryPath = normalizeZipPath(relativePath);
    if (shouldSkipZipEntry(entryPath)) return;
    candidates.push({ entryPath, file });
  });

  const entries = stripSingleTopFolder(candidates, options.mainSkillFileName);
  validateZipEntries(entries, options);

  return Promise.all(
    entries.map(async (entry) => {
      const contentBlob = await entry.file.async('blob');
      const { name, path } = resolveParsedPath(entry.entryPath);
      const content = isTextLikeFile(name) ? await contentBlob.text() : undefined;
      return {
        name,
        path,
        content,
        contentBlob,
        size: contentBlob.size,
      };
    })
  );
}

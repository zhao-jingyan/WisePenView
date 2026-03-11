export interface PathSegment {
  label: string;
  path: string;
}

/**
 * 将路径字符串解析为面包屑分段
 * @param path 路径，如 '/a/b/c' 或 ''
 * @returns 分段数组，首项为根节点 { label: '~', path: '/' }
 */
export function getPathSegments(path: string): PathSegment[] {
  const normalized = path === '' || !path.startsWith('/') ? '/' : path;
  const parts = normalized.split('/').filter(Boolean);
  const segments: PathSegment[] = [{ label: '~', path: '/' }];
  let acc = '';
  for (const p of parts) {
    acc += `/${p}`;
    segments.push({ label: p, path: acc });
  }
  return segments;
}

/**
 * 取路径最后一段作为展示名
 * @param tagName 路径，如 '/a/b/c' 或 '/'
 * @returns 最后一段，空或 '/' 时返回 '/'
 */
export function getFolderDisplayName(tagName: string): string {
  const s = (tagName ?? '').trim();
  if (!s || s === '/') return '/';
  const parts = s.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? s;
}

/** 用于校验文件夹移动的节点，仅需 tagId 与 tagName */
export interface FolderMoveCandidate {
  tagId: string;
  tagName?: string;
}

/**
 * 校验 folder 移动：不能移到自身或子目录下
 */
export function isValidFolderMove(folder: FolderMoveCandidate, dest: FolderMoveCandidate): boolean {
  if (dest.tagId === folder.tagId) return false;
  const folderPath = folder.tagName ?? '';
  const destPath = dest.tagName ?? '';
  if (!folderPath || folderPath === '/') return true;
  return !destPath.startsWith(`${folderPath}/`);
}

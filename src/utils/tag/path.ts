/**
 * 取文件夹显示名：去掉前导 '/'
 * @param tagName 格式为 '/name' 或 '/'
 */
export function getFolderDisplayName(tagName: string): string {
  const s = (tagName ?? '').trim();
  if (!s || s === '/') return '云盘';
  return s.startsWith('/') ? s.slice(1) : s;
}

/**
 * 从路由解析「正在打开的文档 / 笔记」的 resourceId。
 * 匹配 `/app/pdf/:resourceId` 与 `/app/note/:resourceId`（支持 segment 编码）。
 */
export function getOpenedResourceIdFromPath(pathname: string): string | null {
  const matched = pathname.match(/^\/app\/(?:pdf|note)\/(.+)$/);
  if (!matched) return null;
  try {
    return decodeURIComponent(matched[1]);
  } catch {
    return matched[1];
  }
}

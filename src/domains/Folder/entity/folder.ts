/**
 * Folder 领域模型及组合类型
 * Folder 为 TagTreeNode 的别名，表示路径/文件夹语义
 */

import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';

/** 文件夹（路径 tag 节点），TagTreeNode 的语义别名 */
export type Folder = Pick<TagTreeNode, 'tagId' | 'tagName' | 'groupId' | 'parentId' | 'children'>;

export const mapTagToFolder = (tag: TagTreeNode): Folder => {
  const { tagId, tagName, groupId, parentId, children } = tag;
  return {
    tagId,
    tagName,
    groupId,
    parentId,
    children: Array.isArray(children) ? children.map(mapTagToFolder) : [],
  };
};

/** 将 Folder（路径树缓存模型）展宽为 TagTreeNode，供与标签树共用的树逻辑使用 */
export function mapFolderToTagTreeNode(folder: Folder): TagTreeNode {
  return {
    tagId: folder.tagId,
    tagName: folder.tagName,
    groupId: folder.groupId,
    parentId: folder.parentId,
    children: folder.children?.map(mapFolderToTagTreeNode),
  };
}

/** 按路径获取的文件夹+文件列表响应（getResByFolder 用） */
export interface FolderListByPathResponse {
  /** 子文件夹 */
  folders: Folder[];
  /** 该路径下的文件（分页返回，对应当前 filePage） */
  files: ResourceItem[];
  /** 该路径下文件总数（用于无限滚动判断 hasMore） */
  totalFiles: number;
}

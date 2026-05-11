import type { Folder, FolderListByPathResponse } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';

/** 按文件夹路径获取子文件夹与文件列表的请求参数 */
export interface GetResByFolderRequest {
  /** 文件夹 */
  folder: Folder;
  /** 文件分页：页码，默认 1 */
  filePage?: number;
  /** 文件分页：每页条数，默认 20 */
  filePageSize?: number;
}

export interface GetFolderTreeRequest {
  groupId?: string;
}

/** FolderService 接口：供依赖注入使用 */
export interface IFolderService {
  getFolderTree(params: GetFolderTreeRequest): Promise<Folder>;
  /** 从已缓存的扁平索引中按 tagId 查找文件夹（需先调用 getFolderTree） */
  getFolderById(tagId: string, groupId?: string): Folder | undefined;
  getResByFolder(params: GetResByFolderRequest): Promise<FolderListByPathResponse>;
  renameFolder(folder: Folder, newName: string): Promise<void>;
  deleteFolder(folder: Folder): Promise<void>;
  createFolder(parentFolder: Folder, folderName: string): Promise<void>;
  moveFolderToFolder(folder: Folder, newParentFolder: Folder): Promise<void>;
  moveResourceToFolder(folder: Folder, resource: ResourceItem): Promise<void>;
}

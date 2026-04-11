import type { Folder, FolderListByPathResponse } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import type {
  IFolderService,
  GetResByFolderRequest,
  GetFolderTreeRequest,
} from '@/services/Folder/index.type';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MockFileEntry {
  files: Array<Omit<ResourceItem, 'ownerInfo'> & { ownerInfo?: ResourceItem['ownerInfo'] }>;
  totalFiles: number;
}

const root = mockdata.root as Folder;
const filesByFolderId = mockdata.filesByFolderId as Record<string, MockFileEntry>;
const toResourceItem = (
  item: Omit<ResourceItem, 'ownerInfo'> & { ownerInfo?: ResourceItem['ownerInfo'] }
): ResourceItem => ({
  ...item,
  ownerInfo: item.ownerInfo ?? {},
});

const BULK_FILE_COUNT = 250;
const bulkFiles: ResourceItem[] = Array.from({ length: BULK_FILE_COUNT }, (_, i) => ({
  resourceId: `res-bulk-${String(i + 1).padStart(3, '0')}`,
  resourceName: `测试文件-${String(i + 1).padStart(3, '0')}.docx`,
  ownerInfo: {},
  resourceType: 'FILE',
  size: Math.floor(Math.random() * 100000) + 1024,
  currentTags: { 'folder-bulk': '/大量文件' },
}));
filesByFolderId['folder-bulk'] = { files: bulkFiles, totalFiles: BULK_FILE_COUNT };

const flatMap = new Map<string, Folder>();
const buildFlatMap = (folder: Folder) => {
  flatMap.set(folder.tagId, folder);
  (folder.children ?? []).forEach(buildFlatMap);
};
buildFlatMap(root);

const getFolderTree = async (_params: GetFolderTreeRequest = {}): Promise<Folder> => {
  await delay(300);
  return root;
};

const getFolderById = (tagId: string, _groupId?: string): Folder | undefined => {
  return flatMap.get(tagId);
};

const getResByFolder = async (params: GetResByFolderRequest): Promise<FolderListByPathResponse> => {
  await delay(250);
  const folder = flatMap.get(params.folder.tagId);
  const folders = folder?.children ?? [];
  const entry = filesByFolderId[params.folder.tagId];
  const allFiles = (entry?.files ?? []).map(toResourceItem);
  const totalFiles = entry?.totalFiles ?? 0;

  const page = params.filePage ?? 1;
  const pageSize = params.filePageSize ?? 20;
  const start = (page - 1) * pageSize;
  const files = allFiles.slice(start, start + pageSize);

  return { folders, files, totalFiles };
};

const renameFolder = async (_folder: Folder, _newName: string): Promise<void> => {
  await delay(200);
};

const deleteFolder = async (_folder: Folder): Promise<void> => {
  await delay(200);
};

const createFolder = async (_parentFolder: Folder, _folderName: string): Promise<void> => {
  await delay(200);
};

const moveFolderToFolder = async (_folder: Folder, _newParent: Folder): Promise<void> => {
  await delay(200);
};

const moveResourceToFolder = async (_folder: Folder, _resource: ResourceItem): Promise<void> => {
  await delay(200);
};

export const FolderServicesMock: IFolderService = {
  getFolderTree,
  getFolderById,
  getResByFolder,
  renameFolder,
  deleteFolder,
  createFolder,
  moveFolderToFolder,
  moveResourceToFolder,
};

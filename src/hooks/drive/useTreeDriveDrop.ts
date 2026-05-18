import type { Folder } from '@/domains/Folder';
import type { IFolderService } from '@/domains/Folder/service/index.type';
import type { ResourceItem } from '@/domains/Resource';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { getFolderDisplayName } from '@/utils/tag/path';
import { useCallback } from 'react';

export interface UseTreeDriveDropParams {
  folderService: IFolderService;
  refresh: () => void;
}

/** 文件拖放到文件夹 */
export type OnDropFile = (file: ResourceItem, targetFolder: Folder) => Promise<void>;
/** 文件夹拖放到文件夹 */
export type OnDropFolder = (folder: Folder, targetFolder: Folder) => Promise<void>;

/**
 * TreeDrive 拖放逻辑：文件/文件夹拖到目标文件夹后的移动与刷新
 */
export function useTreeDriveDrop(params: UseTreeDriveDropParams): {
  handleDrop: OnDropFile;
  handleDropFolder: OnDropFolder;
} {
  const { folderService, refresh } = params;
  const message = useAppMessage();

  const handleDrop = useCallback<OnDropFile>(
    async (file, targetFolder) => {
      try {
        await folderService.moveResourceToFolder(targetFolder, file);
        message.success(`已移动到「${getFolderDisplayName(targetFolder.tagName)}」`);
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err));
      }
    },
    [folderService, refresh, message]
  );

  const handleDropFolder = useCallback<OnDropFolder>(
    async (folder, targetFolder) => {
      try {
        await folderService.moveFolderToFolder(folder, targetFolder);
        message.success(
          `已将「${getFolderDisplayName(folder.tagName)}」移动到「${getFolderDisplayName(targetFolder.tagName)}」下`
        );
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err));
      }
    },
    [folderService, refresh, message]
  );

  return { handleDrop, handleDropFolder };
}

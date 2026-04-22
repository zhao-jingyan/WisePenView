import { useContext } from 'react';

import type { IAuthService } from '@/services/Auth';
import type { IChatService } from '@/services/Chat';
import type { IDocumentService } from '@/services/Document';
import type { IFolderService } from '@/services/Folder';
import type { IGroupService } from '@/services/Group';
import type { IImageService } from '@/services/Image';
import type { INoteService } from '@/services/Note';
import type { IQuotaService } from '@/services/Quota';
import type { IResourceService } from '@/services/Resource';
import type { IStickerService } from '@/services/Sticker';
import type { ITagService } from '@/services/Tag';
import type { IUserService } from '@/services/User';
import type { IWalletService } from '@/services/Wallet';

import { ServicesContext } from './context';
import type { ServicesContextValue } from './registry';

/** 内部 hook，供各 useXxxService 复用；必须在 ServicesProvider 内使用 */
function useServicesContext(): ServicesContextValue {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServicesContext must be used within ServicesProvider');
  }
  return ctx;
}

// 第七步：导出 useXxxService hook，组件内通过 useOrderService() 等获取实例
export const useAuthService = (): IAuthService => useServicesContext().authService;
export const useChatService = (): IChatService => useServicesContext().chatService;
export const useDocumentService = (): IDocumentService => useServicesContext().documentService;
export const useFolderService = (): IFolderService => useServicesContext().folderService;
export const useGroupService = (): IGroupService => useServicesContext().groupService;
export const useImageService = (): IImageService => useServicesContext().imageService;
export const useNoteService = (): INoteService => useServicesContext().noteService;
export const useQuotaService = (): IQuotaService => useServicesContext().quotaService;
export const useResourceService = (): IResourceService => useServicesContext().resourceService;
export const useStickerService = (): IStickerService => useServicesContext().stickerService;
export const useTagService = (): ITagService => useServicesContext().tagService;
export const useUserService = (): IUserService => useServicesContext().userService;
/** 个人中心钱包、高级组 token 相关页注入 */
export const useWalletService = (): IWalletService => useServicesContext().walletService;

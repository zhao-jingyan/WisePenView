import { useContext } from 'react';

import type { IAuthService } from '@/domains/Auth';
import type { IChatService } from '@/domains/Chat';
import type { IDocumentService } from '@/domains/Document';
import type { IFolderService } from '@/domains/Folder';
import type { IGroupService } from '@/domains/Group';
import type { IImageService } from '@/domains/Image';
import type { INoteService } from '@/domains/Note';
import type { IQuotaService } from '@/domains/Quota';
import type { IResourceService } from '@/domains/Resource';
import type { IStickerService } from '@/domains/Sticker';
import type { ITagService } from '@/domains/Tag';
import type { IUserService } from '@/domains/User';
import type { IWalletService } from '@/domains/Wallet';

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

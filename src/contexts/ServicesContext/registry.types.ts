// 第四步：在 ServicesContextValue 中新增该服务的类型
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

export interface ServicesContextValue {
  authService: IAuthService;
  chatService: IChatService;
  documentService: IDocumentService;
  folderService: IFolderService;
  groupService: IGroupService;
  imageService: IImageService;
  noteService: INoteService;
  quotaService: IQuotaService;
  resourceService: IResourceService;
  stickerService: IStickerService;
  tagService: ITagService;
  userService: IUserService;
  walletService: IWalletService;
}

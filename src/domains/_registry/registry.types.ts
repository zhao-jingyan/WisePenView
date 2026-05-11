// 第四步：在 ServicesContextValue 中新增该服务的类型
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

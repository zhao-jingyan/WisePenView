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
  auth: IAuthService;
  chat: IChatService;
  document: IDocumentService;
  folder: IFolderService;
  group: IGroupService;
  image: IImageService;
  note: INoteService;
  quota: IQuotaService;
  resource: IResourceService;
  sticker: IStickerService;
  tag: ITagService;
  user: IUserService;
  /** 见 src/services/Wallet */
  wallet: IWalletService;
}

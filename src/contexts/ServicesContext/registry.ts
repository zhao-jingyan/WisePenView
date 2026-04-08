/**
 * Services 注册表：真实实现与 Mock 绑定、Context 取值
 *
 * 新增服务时配合 ServicesProvider、hooks 文件完成注册；详细步骤见 `index.ts` 同目录注释。
 */

// 第一步：导入该服务的接口类型
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

// 第二步：导入真实实现（*Services.impl.ts，调用后端 API）
import { AuthServicesImpl } from '@/services/Auth/AuthServices.impl';
import { ChatServicesImpl } from '@/services/Chat/ChatServices.impl';
import { DocumentServicesImpl } from '@/services/Document/DocumentServices.impl';
import { FolderServicesImpl } from '@/services/Folder/FolderServices.impl';
import { GroupServicesImpl } from '@/services/Group/GroupServices.impl';
import { ImageServicesImpl } from '@/services/Image/ImageServices.impl';
import { NoteServicesImpl } from '@/services/Note/NoteServices.impl';
import { QuotaServicesImpl } from '@/services/Quota/QuotaServices.impl';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import { StickerServicesImpl } from '@/services/Sticker/StickerServices.impl';
import { TagServicesImpl } from '@/services/Tag/TagServices.impl';
import { UserServicesImpl } from '@/services/User/UserServices.impl';
import { WalletServicesImpl } from '@/services/Wallet/WalletServices.impl';

// 第三步：导入 Mock 实现（src/mocks/Xxx/XxxServices.mock.ts，用于 MODE === 'mock' 时）
import { AuthServicesMock } from '@/mocks/Auth/AuthServices.mock';
import { ChatServicesMock } from '@/mocks/Chat/ChatServices.mock';
import { DocumentServicesMock } from '@/mocks/Document/DocumentServices.mock';
import { FolderServicesMock } from '@/mocks/Folder/FolderServices.mock';
import { GroupServicesMock } from '@/mocks/Group/GroupServices.mock';
import { ImageServicesMock } from '@/mocks/Image/ImageServices.mock';
import { NoteServicesMock } from '@/mocks/Note/NoteServices.mock';
import { QuotaServicesMock } from '@/mocks/Quota/QuotaServices.mock';
import { ResourceServicesMock } from '@/mocks/Resource/ResourceServices.mock';
import { StickerServicesMock } from '@/mocks/Sticker/StickerServices.mock';
import { TagServicesMock } from '@/mocks/Tag/TagServices.mock';
import { UserServicesMock } from '@/mocks/User/UserServices.mock';
import { WalletServicesMock } from '@/mocks/Wallet/WalletServices.mock';

// 第四步：在 ServicesContextValue 中新增该服务的类型
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

// 第五步：在 servicesValue 中绑定真实实现
const servicesValue: ServicesContextValue = {
  auth: AuthServicesImpl,
  chat: ChatServicesImpl,
  document: DocumentServicesImpl,
  folder: FolderServicesImpl,
  group: GroupServicesImpl,
  image: ImageServicesImpl,
  note: NoteServicesImpl,
  quota: QuotaServicesImpl,
  resource: ResourceServicesImpl,
  sticker: StickerServicesImpl,
  tag: TagServicesImpl,
  user: UserServicesImpl,
  wallet: WalletServicesImpl,
};

// 第六步：在 mockServicesValue 中绑定 Mock 实现
const mockServicesValue: ServicesContextValue = {
  auth: AuthServicesMock,
  chat: ChatServicesMock,
  document: DocumentServicesMock,
  folder: FolderServicesMock,
  group: GroupServicesMock,
  image: ImageServicesMock,
  note: NoteServicesMock,
  quota: QuotaServicesMock,
  resource: ResourceServicesMock,
  sticker: StickerServicesMock,
  tag: TagServicesMock,
  user: UserServicesMock,
  wallet: WalletServicesMock,
};

/** 根据运行环境选择真实实现或 Mock：MODE === 'mock' 时使用 mockServicesValue */
export function getContextValue(): ServicesContextValue {
  if (import.meta.env.MODE === 'mock') {
    return mockServicesValue;
  }
  return servicesValue;
}

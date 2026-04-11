/**
 * 真实服务注册表：仅绑定 *Services.impl.ts
 */
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

import type { ServicesContextValue } from './registry.types';

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

export function getContextValue(): ServicesContextValue {
  return servicesValue;
}

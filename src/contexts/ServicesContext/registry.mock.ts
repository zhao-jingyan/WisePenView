/**
 * Mock 服务注册表：仅绑定 *Services.mock.ts
 */
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

import type { ServicesContextValue } from './registry.types';

const mockServicesValue: ServicesContextValue = {
  authService: AuthServicesMock,
  chatService: ChatServicesMock,
  documentService: DocumentServicesMock,
  folderService: FolderServicesMock,
  groupService: GroupServicesMock,
  imageService: ImageServicesMock,
  noteService: NoteServicesMock,
  quotaService: QuotaServicesMock,
  resourceService: ResourceServicesMock,
  stickerService: StickerServicesMock,
  tagService: TagServicesMock,
  userService: UserServicesMock,
  walletService: WalletServicesMock,
};

export function getContextValue(): ServicesContextValue {
  return mockServicesValue;
}

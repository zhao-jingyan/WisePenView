/**
 * 真实服务注册表：Service 依赖装配入口
 *
 * 统一形态：每个 *Services.impl.ts 均导出 createXxxServices(deps?): IXxxService 工厂。
 *
 * 装配规则：
 * - Level 0：无跨 service 依赖，工厂无参。
 * - Level 1：依赖 Level 0，通过参数注入依赖后构建。
 *
 * 为避免循环依赖与隐式耦合，service 间不得互相直接 import 实现，必须经此装配。
 * 新增更深层级（Level 2+）时在此文件延展，保持"分层 + 显式注入"。
 */
import { createAuthServices } from '@/services/Auth/AuthServices.impl';
import { createChatServices } from '@/services/Chat/ChatServices.impl';
import { createDocumentServices } from '@/services/Document/DocumentServices.impl';
import { createFolderServices } from '@/services/Folder/FolderServices.impl';
import { createGroupServices } from '@/services/Group/GroupServices.impl';
import { createImageServices } from '@/services/Image/ImageServices.impl';
import { createNoteServices } from '@/services/Note/NoteServices.impl';
import { createQuotaServices } from '@/services/Quota/QuotaServices.impl';
import { createResourceServices } from '@/services/Resource/ResourceServices.impl';
import { createStickerServices } from '@/services/Sticker/StickerServices.impl';
import { createTagServices } from '@/services/Tag/TagServices.impl';
import { createUserServices } from '@/services/User/UserServices.impl';
import { createWalletServices } from '@/services/Wallet/WalletServices.impl';

import type { ServicesContextValue } from './registry.types';

// Level 0：无跨 service 依赖
const authService = createAuthServices();
const chatService = createChatServices();
const documentService = createDocumentServices();
const groupService = createGroupServices();
const imageService = createImageServices();
const noteService = createNoteServices();
const quotaService = createQuotaServices();
const resourceService = createResourceServices();
const userService = createUserServices();
const walletService = createWalletServices();

// Level 1：依赖 Level 0
const tagService = createTagServices({ resourceService: resourceService });
const stickerService = createStickerServices({ resourceService: resourceService });
const folderService = createFolderServices({ resourceService: resourceService });

const servicesValue: ServicesContextValue = {
  authService: authService,
  chatService: chatService,
  documentService: documentService,
  folderService: folderService,
  groupService: groupService,
  imageService: imageService,
  noteService: noteService,
  quotaService: quotaService,
  resourceService: resourceService,
  stickerService: stickerService,
  tagService: tagService,
  userService: userService,
  walletService: walletService,
};

export function getContextValue(): ServicesContextValue {
  return servicesValue;
}

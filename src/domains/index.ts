/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 */
export {
  ServicesProvider,
  useAuthService,
  useChatService,
  useDocumentService,
  useFolderService,
  useGroupService,
  useImageService,
  useNoteService,
  useQuotaService,
  useResourceService,
  useStickerService,
  useTagService,
  useUserService,
  useWalletService,
} from './_registry';
export type { ServicesContextValue } from './_registry';

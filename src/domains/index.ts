/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 */
export {
  ServicesProvider,
  useAdminService,
  useAuthService,
  useChatService,
  useDocumentService,
  useDriveService,
  useGroupService,
  useImageService,
  useInteractService,
  useNoteService,
  useQuotaService,
  useResourceService,
  useSkillService,
  useSpeechService,
  useTagService,
  useUserService,
  useWalletService,
} from './_registry';
export type { ServicesContextValue } from './_registry';
export { FEEDBACK_TYPE } from './User';
export type { FeedbackType, SubmitFeedbackRequest } from './User';

export type { ChatAgentOption, ChatAgentType } from './entity/agent';
export type {
  ChatMessageMetadata,
  MessageAttachmentSnapshot,
  WisePenUIMessage,
} from './entity/message';
export { MODEL_PROVIDER_ID, MODEL_TYPE } from './enum/model';
export type { ModelProviderId, ModelType } from './enum/model';
export {
  buildAgentFromResourceItem,
  buildAgentFromSkillTreeGroup,
  buildChatInputAgentOptions,
  buildDefaultPersonalAgent,
  resolveChatInputSelectedAgent,
} from './mapper/agent.mapper';
export { buildCapabilityPickerSections as buildSkillMenuSections } from './mapper/capabilityPicker.mapper';
export type {
  CapabilitySkillSelection,
  CapabilityToolOption,
} from './mapper/capabilityPicker.mapper';
export {
  buildAdvancedSkillTreeGroups,
  buildOtherSkillTreeGroups,
  getPrimarySkillsForAgent,
} from './mapper/skillScope.mapper';
export type { SkillScopeTreeGroup } from './mapper/skillScope.mapper';
export type {
  ChatInputCapabilityOptions,
  ChatModel,
  ChatModelProviderOption,
  ChatModelTag,
  ChatServiceDeps,
  ChatSession,
  ChatWorkspace,
  CreateSessionRequest,
  DeleteSessionRequest,
  GetChatInputCapabilityOptionsParams,
  IChatService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  PageResult,
  RenameSessionRequest,
  ToolOption,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './service/index.type';
export type {
  ChatCompletionRequest,
  ChatFrontendState,
  SendSessionMessageOptions,
  UseChatSessionOptions,
} from './session/index.type';
export { useChatHistory } from './session/useChatHistory';
export { useChatSession } from './session/useChatSession';

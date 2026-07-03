import type { IDriveService } from '@/domains/Drive';
import type { Group, IGroupService } from '@/domains/Group';
import type { IResourceService, SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import type { CapabilityToolOption } from '../mapper/capabilityPicker.mapper';
import type { SkillScopeTreeGroup } from '../mapper/skillScope.mapper';

export interface ToolOption {
  toolId: string;
  label: string;
}

export interface ChatModelTag {
  text: string;
  type: string;
}

export interface ChatModelProviderOption {
  providerId: string;
  providerName?: string | null;
  providerModelName: string;
  provider: string;
  supportRuntimeOptions: Record<string, unknown>;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
}

export interface ChatModel {
  /** 前端选择项 ID；同一个模型存在多个 provider mapping 时用于区分选项 */
  id: string;
  /** 后端模型 ID；发送 /chat/completions 时使用 */
  modelId: string;
  name: string;
  provider: string;
  providerId?: string;
  providerName?: string | null;
  providerModelName?: string;
  providerOptions: ChatModelProviderOption[];
  scope: string;
  modelFamily: string;
  ratio: number;
  supportThinking: boolean;
  supportTools: boolean;
  tags: ChatModelTag[];
  multiplier: string | null;
  isDefault: boolean;
  vision: boolean;
  usageRank: number;
  contextWindowTokens?: number | null;
  maxOutputTokens?: number | null;
  category: 'reasoning' | 'chat' | 'coding' | 'all-round';
}

export interface UploadAttachmentParams {
  file: File;
  saveToLibrary?: boolean;
}

export interface UploadAttachmentResult {
  attachmentId: string;
  filename?: string;
}

export interface ChatServiceDeps {
  groupService: IGroupService;
  resourceService: IResourceService;
  driveService: IDriveService;
}

export interface ChatWorkspace {
  groups: Group[];
  skills: SkillSummary[];
  personalAgents: ChatAgentOption[];
  groupAgents: ChatAgentOption[];
}

export interface ChatInputCapabilityOptions {
  primarySkills: SkillSummary[];
  otherSkillGroups: SkillScopeTreeGroup[];
  tools: CapabilityToolOption[];
}

export interface GetChatInputCapabilityOptionsParams {
  agent: ChatAgentOption | null;
}

export type GetChatInputCapabilityOptionsRequest = GetChatInputCapabilityOptionsParams;

export type ChatDocumentPickerScopeType = 'personal' | 'group';

export interface ChatDocumentPickerScope {
  scopeKey: string;
  label: string;
  rootId: string;
  type: ChatDocumentPickerScopeType;
  groupId?: string;
}

export type ChatDocumentPickerNodeType = 'root' | 'folder' | 'resource' | 'link';

export interface ChatDocumentPickerNode {
  nodeId: string;
  title: string;
  type: ChatDocumentPickerNodeType;
  groupId: string | null;
  resourceId: string | null;
  resourceName: string | null;
  resourceType: string | null;
  isLeaf: boolean;
  selectable: boolean;
}

export interface ChatDocumentPickerSelectedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface ListDocumentPickerChildrenRequest {
  rootId: string;
  groupId?: string;
  parentNodeId?: string;
}

/** ChatService 接口 */
export interface IChatService {
  getModels(): Promise<ChatModel[]>;
  getWorkspace(): Promise<ChatWorkspace>;
  getChatInputAgents(): Promise<ChatAgentOption[]>;
  getChatInputCapabilityOptions(
    params: GetChatInputCapabilityOptionsParams
  ): Promise<ChatInputCapabilityOptions>;
  getDocumentPickerScopes(): Promise<ChatDocumentPickerScope[]>;
  listDocumentPickerChildren(
    params: ListDocumentPickerChildrenRequest
  ): Promise<ChatDocumentPickerNode[]>;
  createSession(params?: CreateSessionRequest): Promise<ChatSession>;
  renameSession(params: RenameSessionRequest): Promise<ChatSession>;
  deleteSession(params: DeleteSessionRequest): Promise<void>;
  listSessions(params?: ListSessionsRequest): Promise<PageResult<ChatSession>>;
  listHistoryMessages(params: ListHistoryMessagesRequest): Promise<PageResult<MessageResponse>>;
  getTools(): Promise<ToolOption[]>;
  uploadAttachment(params: UploadAttachmentParams): Promise<UploadAttachmentResult>;
}

/** `GET /chat/model/listAvailableModels` 的 data 字段结构 */
/** 会话重命名请求参数（UI 侧使用 camelCase，Service 内部映射为接口字段） */
export interface RenameSessionRequest {
  sessionId: string;
  newTitle?: string;
}

/** 创建会话请求参数（与 POST /session/createSession 对齐） */
export interface CreateSessionRequest {
  title?: string;
}

/** 会话实体（与 SessionResponse 对齐） */
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

/** 删除会话请求参数 */
export interface DeleteSessionRequest {
  sessionId: string;
}

/** 拉取会话列表请求参数 */
export interface ListSessionsRequest {
  page?: number;
  size?: number;
}

/** 拉取历史消息请求参数 */
export interface ListHistoryMessagesRequest {
  sessionId: string;
  page?: number;
  size?: number;
}

/** 历史消息角色 */
export type MessageRole = 'user' | 'assistant';

/** 历史消息分片 */
export interface MessagePartResponse {
  type: string;
  text: string | null;
  state: string | null;
  toolCallId: string | null;
  input: unknown;
  output: unknown;
}

/** 历史消息实体（与 MessageResponse 对齐） */
export interface MessageResponse {
  id: string;
  role: MessageRole;
  model_id?: number | string | null;
  content?: string;
  parts?: MessagePartResponse[];
  tool_calls?: unknown[] | null;
  createdAt?: string;
  created_at?: string;
}

/** 分页返回结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

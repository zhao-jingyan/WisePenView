export interface ChatFrontendState {
  key: string;
  value: unknown;
  disabled?: boolean;
}

export interface ChatWorkspaceContext {
  resourceId: string;
  resourceType: string;
  viewer?: string;
  editorType?: string;
}

export interface ChatSelectedResourceContext {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface ChatUploadedAttachmentContext {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface ChatCompletionRequest {
  session_id: string;
  query: string;
  model?: string;
  provider_id?: string;
  runtime_options?: Record<string, unknown>;
  frontend_states?: ChatFrontendState[];
  user_defined_attachment_ids?: string[];
  user_defined_allow_tool_names?: string[];
  user_defined_deny_tool_names?: string[];
  user_defined_on_demand_skill_ids?: string[];
  user_defined_force_enabled_skill_ids?: string[];
}

export interface SendSessionMessageOptions {
  sessionId?: string;
  model?: string;
  providerId?: string;
  runtimeOptions?: Record<string, unknown>;
  selectedText?: string;
  enableSelected?: boolean;
  workspaceContext?: ChatWorkspaceContext;
  selectedResources?: ChatSelectedResourceContext[];
  uploadedAttachments?: ChatUploadedAttachmentContext[];
  allowToolNames?: string[];
  denyToolNames?: string[];
  onDemandSkillIds?: string[];
  forceEnabledSkillIds?: string[];
}

export interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
}

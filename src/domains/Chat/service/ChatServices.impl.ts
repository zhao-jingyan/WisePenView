import type { Group } from '@/domains/Group';
import { useCurrentChatSessionStore, useNewChatSessionStore, useNoteSelectionStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { ChatApi, ChatSessionApi } from '../apis/ChatApi';
import { ChatServicesMap } from '../mapper/ChatServices.map';
import { buildDocumentPickerScopes } from '../mapper/documentPicker.mapper';
import {
  buildCapabilityOptions,
  buildChatInputAgents,
  buildDocumentPickerNodes,
  buildGroupResourceBatch,
  buildWorkspaceAgents,
  buildWorkspaceSkills,
  mergeUniqueGroups,
  type GroupResourceBatch,
} from './ChatServices.helper';
import type {
  ChatDocumentPickerNode,
  ChatDocumentPickerScope,
  ChatInputCapabilityOptions,
  ChatModel,
  ChatServiceDeps,
  ChatSession,
  ChatWorkspace,
  CreateSessionRequest,
  DeleteSessionRequest,
  GetChatInputCapabilityOptionsParams,
  IChatService,
  ListDocumentPickerChildrenRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  RenameSessionRequest,
  ToolOption,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from './index.type';

const getModels = async (): Promise<ChatModel[]> => {
  const data = await ChatApi.listModels();
  return ChatServicesMap.mapGetModelsFromApi(data);
};

const fetchAllGroups = async (deps: ChatServiceDeps): Promise<Group[]> => {
  const [joinedData, managedData] = await Promise.all([
    deps.groupService.fetchGroupList({ groupRoleFilter: 'JOINED', page: 1, size: 100 }),
    deps.groupService.fetchGroupList({ groupRoleFilter: 'MANAGED', page: 1, size: 100 }),
  ]);

  return mergeUniqueGroups(joinedData.groups, managedData.groups);
};

const fetchGroupResourceBatch = async (
  deps: ChatServiceDeps,
  group: Group,
  resourceType: 'AGENT' | 'SKILL'
): Promise<GroupResourceBatch> => {
  const result = await deps.resourceService.getGroupResources({
    groupId: group.groupId,
    page: 1,
    size: 200,
    sortBy: 'NAME',
    sortDir: 'ASC',
    resourceType,
  });
  return buildGroupResourceBatch(group, result.list);
};

const fetchAllSkills = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<ChatWorkspace['skills']> => {
  const personalRequest = deps.resourceService.getUserResources({
    page: 1,
    size: 200,
    sortBy: 'NAME',
    sortDir: 'ASC',
    resourceType: 'SKILL',
  });
  const groupRequests: Array<Promise<GroupResourceBatch>> = [];
  for (const group of groups) {
    groupRequests.push(fetchGroupResourceBatch(deps, group, 'SKILL'));
  }

  const [personalResult, groupBatches] = await Promise.all([
    personalRequest,
    Promise.all(groupRequests),
  ]);

  return buildWorkspaceSkills(personalResult.list, groupBatches);
};

const fetchAllAgents = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'>> => {
  const personalRequest = deps.resourceService.getUserResources({
    page: 1,
    size: 200,
    sortBy: 'NAME',
    sortDir: 'ASC',
    resourceType: 'AGENT',
  });
  const groupRequests: Array<Promise<GroupResourceBatch>> = [];
  for (const group of groups) {
    groupRequests.push(fetchGroupResourceBatch(deps, group, 'AGENT'));
  }

  const [personalResult, groupBatches] = await Promise.all([
    personalRequest,
    Promise.all(groupRequests),
  ]);

  return buildWorkspaceAgents(personalResult.list, groupBatches);
};

const getWorkspace = async (deps: ChatServiceDeps): Promise<ChatWorkspace> => {
  const groups = await fetchAllGroups(deps);
  const [skills, agentData] = await Promise.all([
    fetchAllSkills(deps, groups),
    fetchAllAgents(deps, groups),
  ]);
  return {
    groups,
    skills,
    personalAgents: agentData.personalAgents,
    groupAgents: agentData.groupAgents,
  };
};

const getChatInputAgents = async (
  deps: ChatServiceDeps
): Promise<ChatWorkspace['personalAgents']> => {
  const workspace = await getWorkspace(deps);
  return buildChatInputAgents(workspace);
};

const getChatInputCapabilityOptions = async (
  deps: ChatServiceDeps,
  params: GetChatInputCapabilityOptionsParams
): Promise<ChatInputCapabilityOptions> => {
  const [workspace, tools] = await Promise.all([getWorkspace(deps), getTools()]);
  return buildCapabilityOptions(workspace, tools, params);
};

const getDocumentPickerScopes = async (
  deps: ChatServiceDeps
): Promise<ChatDocumentPickerScope[]> => {
  const groups = await fetchAllGroups(deps);
  return buildDocumentPickerScopes(groups);
};

const listDocumentPickerChildren = async (
  deps: ChatServiceDeps,
  params: ListDocumentPickerChildrenRequest
): Promise<ChatDocumentPickerNode[]> => {
  let parentNodeId = params.parentNodeId;
  if (!parentNodeId) {
    const rootNode = await deps.driveService.getRootNode({
      rootId: params.rootId,
      groupId: params.groupId,
    });
    parentNodeId = rootNode.id;
  }
  if (!parentNodeId) return [];

  const children = await deps.driveService.listNodeChildren({
    nodeId: parentNodeId,
    groupId: params.groupId,
  });

  return buildDocumentPickerNodes(children);
};

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const payload = ChatServicesMap.mapCreateSessionRequest(params);
  const data = await ChatSessionApi.createSession(payload);
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_CREATE_SESSION_FAILED);
  }
  return ChatServicesMap.mapCreateSessionFromApi(data);
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const payload = ChatServicesMap.mapRenameSessionRequest(params);
  const data = await ChatSessionApi.renameSession(payload);
  if (!data) {
    throw createClientError(FRONTEND_CLIENT_ERROR.CHAT_RENAME_SESSION_FAILED);
  }
  return ChatServicesMap.mapRenameSessionFromApi(data);
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  await ChatSessionApi.deleteSession({ sessionId: params.sessionId });
  useCurrentChatSessionStore.getState().clearCurrentSessionById(params.sessionId);
  useNewChatSessionStore.getState().clearNewChatSessionById(params.sessionId);
  useNoteSelectionStore.getState().clearSelectedText(params.sessionId);
};

const listSessions = async (params?: ListSessionsRequest): Promise<PageResult<ChatSession>> => {
  const query = ChatServicesMap.mapListSessionsRequest(params);
  const payload = await ChatSessionApi.listSessions(query);
  return ChatServicesMap.mapListSessionsFromApi(payload);
};

const listHistoryMessages = async (
  params: ListHistoryMessagesRequest
): Promise<PageResult<MessageResponse>> => {
  const query = ChatServicesMap.mapListHistoryMessagesRequest(params);
  const payload = await ChatSessionApi.listHistoryMessages(query);
  return ChatServicesMap.mapListHistoryMessagesFromApi(payload);
};

const getTools = async (): Promise<ToolOption[]> => {
  return await ChatApi.getTools();
};

const uploadAttachment = async ({
  file,
  saveToLibrary,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('save_to_library', String(Boolean(saveToLibrary)));
  const res = await ChatApi.uploadAttachment(formData);
  return ChatServicesMap.mapUploadAttachmentFromApi(res, file.name);
};

export const createChatServices = (deps?: ChatServiceDeps): IChatService => {
  const getRequiredDeps = (): ChatServiceDeps => {
    if (!deps) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
    }
    return deps;
  };

  return {
    getModels,
    getWorkspace: async () => getWorkspace(getRequiredDeps()),
    getChatInputAgents: async () => getChatInputAgents(getRequiredDeps()),
    getChatInputCapabilityOptions: async (params) =>
      getChatInputCapabilityOptions(getRequiredDeps(), params),
    getDocumentPickerScopes: async () => getDocumentPickerScopes(getRequiredDeps()),
    listDocumentPickerChildren: async (params) =>
      listDocumentPickerChildren(getRequiredDeps(), params),
    createSession,
    renameSession,
    deleteSession,
    listSessions,
    listHistoryMessages,
    getTools,
    uploadAttachment,
  };
};

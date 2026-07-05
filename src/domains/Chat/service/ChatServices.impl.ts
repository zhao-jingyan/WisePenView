import type { FetchGroupListRequest, Group } from '@/domains/Group';
import type { ResourceItem, ResourceListPage } from '@/domains/Resource';
import { useCurrentChatSessionStore, useNewChatSessionStore, useNoteSelectionStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { ChatApi, ChatSessionApi } from '../apis/ChatApi';
import { ChatServicesMap } from '../mapper/ChatServices.map';
import type { ChatUploadedAttachmentContext } from '../session/index.type';
import {
  buildChatInputAgents,
  buildDocumentPickerNodes,
  buildDocumentPickerScopes,
  buildGroupResourceBatch,
  buildSkillMenuOptions,
  buildWorkspaceAgents,
  buildWorkspaceSkills,
  mergeUniqueGroups,
  type GroupResourceBatch,
} from './ChatServices.helper';
import type {
  ChatDocumentPickerNode,
  ChatDocumentPickerScope,
  ChatInputSkillMenuOptions,
  ChatModel,
  ChatServiceDeps,
  ChatSession,
  ChatWorkspace,
  CreateSessionRequest,
  DeleteSessionRequest,
  GetChatInputSkillMenuOptionsParams,
  IChatService,
  ListDocumentPickerChildrenRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  RenameSessionRequest,
  ToolOption,
  UploadAttachmentParams,
} from './index.type';

const WORKSPACE_GROUP_PAGE_SIZE = 100;
const WORKSPACE_RESOURCE_PAGE_SIZE = 200;

type WorkspaceResourceType = 'AGENT' | 'SKILL';

const getModels = async (): Promise<ChatModel[]> => {
  const data = await ChatApi.listModels();
  return ChatServicesMap.mapGetModelsFromApi(data);
};

const fetchGroupRolePages = async (
  deps: ChatServiceDeps,
  groupRoleFilter: FetchGroupListRequest['groupRoleFilter']
): Promise<Group[]> => {
  const groups: Group[] = [];
  let page = 1;

  while (true) {
    const result = await deps.groupService.fetchGroupList({
      groupRoleFilter,
      page,
      size: WORKSPACE_GROUP_PAGE_SIZE,
    });
    groups.push(...result.list);

    const reachedKnownTotal = result.total > 0 && groups.length >= result.total;
    const reachedShortPage = result.list.length < WORKSPACE_GROUP_PAGE_SIZE;
    if (reachedKnownTotal || reachedShortPage) break;
    page += 1;
  }

  return groups;
};

const fetchAllGroups = async (deps: ChatServiceDeps): Promise<Group[]> => {
  const [joinedData, managedData] = await Promise.all([
    fetchGroupRolePages(deps, 'JOINED'),
    fetchGroupRolePages(deps, 'MANAGED'),
  ]);

  return mergeUniqueGroups(joinedData, managedData);
};

const fetchResourcePages = async (
  requestPage: (page: number) => Promise<ResourceListPage>
): Promise<ResourceItem[]> => {
  const items: ResourceItem[] = [];
  let page = 1;

  while (true) {
    const result = await requestPage(page);
    items.push(...result.list);

    const pageSize = result.size > 0 ? result.size : WORKSPACE_RESOURCE_PAGE_SIZE;
    const reachedKnownTotal = result.total > 0 && items.length >= result.total;
    const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
    const reachedShortPage = result.list.length < pageSize;
    if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) break;
    page += 1;
  }

  return items;
};

const fetchGroupResourceBatch = async (
  deps: ChatServiceDeps,
  group: Group,
  resourceType: WorkspaceResourceType
): Promise<GroupResourceBatch> => {
  const items = await fetchResourcePages((page) =>
    deps.resourceService.getGroupResources({
      groupId: group.groupId,
      page,
      size: WORKSPACE_RESOURCE_PAGE_SIZE,
      sortBy: 'NAME',
      sortDir: 'ASC',
      resourceType,
    })
  );
  return buildGroupResourceBatch(group, items);
};

const fetchPersonalResourceItems = async (
  deps: ChatServiceDeps,
  resourceType: WorkspaceResourceType
): Promise<ResourceItem[]> => {
  return fetchResourcePages((page) =>
    deps.resourceService.getUserResources({
      page,
      size: WORKSPACE_RESOURCE_PAGE_SIZE,
      sortBy: 'NAME',
      sortDir: 'ASC',
      resourceType,
    })
  );
};

const fetchAllSkills = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<ChatWorkspace['skills']> => {
  const personalRequest = fetchPersonalResourceItems(deps, 'SKILL');
  const groupRequests: Array<Promise<GroupResourceBatch>> = [];
  for (const group of groups) {
    groupRequests.push(fetchGroupResourceBatch(deps, group, 'SKILL'));
  }

  const [personalResult, groupBatches] = await Promise.all([
    personalRequest,
    Promise.all(groupRequests),
  ]);

  return buildWorkspaceSkills(personalResult, groupBatches);
};

const fetchAllAgents = async (
  deps: ChatServiceDeps,
  groups: Group[]
): Promise<Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'>> => {
  const personalRequest = fetchPersonalResourceItems(deps, 'AGENT');
  const groupRequests: Array<Promise<GroupResourceBatch>> = [];
  for (const group of groups) {
    groupRequests.push(fetchGroupResourceBatch(deps, group, 'AGENT'));
  }

  const [personalResult, groupBatches] = await Promise.all([
    personalRequest,
    Promise.all(groupRequests),
  ]);

  return buildWorkspaceAgents(personalResult, groupBatches);
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

const getChatInputSkillMenuOptions = async (
  deps: ChatServiceDeps,
  params: GetChatInputSkillMenuOptionsParams
): Promise<ChatInputSkillMenuOptions> => {
  const [workspace, tools] = await Promise.all([getWorkspace(deps), getTools()]);
  return buildSkillMenuOptions(workspace, tools, params);
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
}: UploadAttachmentParams): Promise<ChatUploadedAttachmentContext> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('save_to_library', String(Boolean(saveToLibrary)));
  const res = await ChatApi.uploadAttachment(formData);
  const result = ChatServicesMap.mapUploadAttachmentFromApi(res, file.name);
  return ChatServicesMap.mapUploadAttachmentResultToContext(result);
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
    getChatInputSkillMenuOptions: async (params) =>
      getChatInputSkillMenuOptions(getRequiredDeps(), params),
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

import type {
  ChatSession,
  IChatService,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  ToolOption,
  UploadAttachmentParams,
  UploadAttachmentResult,
} from '@/domains/Chat';
import { MODEL_TYPE } from '@/domains/Chat';
import type { Group } from '@/domains/Group';

type MockModelSeed = {
  name: string;
  provider: string;
  category: 'reasoning' | 'general';
  vision: boolean;
};

const MOCK_MODELS: MockModelSeed[] = [
  { name: 'GPT-4o Mini', provider: 'openai', category: 'general', vision: true },
  { name: 'DeepSeek V3', provider: 'deepseek', category: 'general', vision: false },
  { name: 'Gemini 2.5 Flash', provider: 'google', category: 'general', vision: true },
  { name: 'Claude 3.7 Sonnet', provider: 'anthropic', category: 'reasoning', vision: true },
  { name: 'o3', provider: 'openai', category: 'reasoning', vision: true },
  { name: 'Mistral Large', provider: 'mistral', category: 'general', vision: false },
];

const providerToVendor = (provider: string): string => {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google';
    case 'grok':
      return 'xAI';
    case 'deepseek':
      return 'DeepSeek';
    case 'doubao':
      return 'Doubao';
    case 'meta':
      return 'Meta';
    case 'mistral':
      return 'Mistral';
    default:
      return 'OpenAI';
  }
};

const getModels: IChatService['getModels'] = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rawModels = [
        ...MOCK_MODELS.slice(0, 3).map((item, i) => ({
          id: `mock-system-${i + 1}`,
          scope: 'system',
          display_name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.STANDARD_MODEL,
          billing_ratio: 1,
          support_thinking: item.category === 'reasoning',
          support_vision: item.vision,
          support_tools: true,
          support_streaming: true,
          is_active: true,
        })),
        ...MOCK_MODELS.slice(3, 5).map((item, i) => ({
          id: `mock-user-${i + 1}`,
          scope: 'user',
          display_name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.ADVANCED_MODEL,
          billing_ratio: 10,
          support_thinking: true,
          support_vision: item.vision,
          support_tools: true,
          support_streaming: true,
          is_active: true,
        })),
      ];
      resolve(
        rawModels.map((item, index) => ({
          id: String(item.id),
          name: item.display_name,
          vendor: item.vendor,
          provider: providerToVendor(item.vendor).toLowerCase(),
          ratio: item.billing_ratio,
          supportThinking: item.support_thinking,
          tags: [
            ...(item.is_active && index === 0
              ? ([{ text: 'Default', type: 'blue' }] as Array<{ text: string; type: string }>)
              : []),
            ...(item.support_thinking
              ? ([{ text: 'Thinking', type: 'purple' }] as Array<{ text: string; type: string }>)
              : []),
          ],
          multiplier: item.billing_ratio >= 1 ? `${item.billing_ratio}x 消耗` : null,
          isDefault: item.is_active && index === 0,
          vision: item.support_vision,
          usageRank: index + 1,
          category:
            item.type === MODEL_TYPE.ADVANCED_MODEL
              ? 'reasoning'
              : item.type === MODEL_TYPE.STANDARD_MODEL
                ? 'all-round'
                : 'chat',
        }))
      );
    }, 200);
  });
};

const nowIso = (): string => new Date().toISOString();
const MOCK_HISTORY_SIZE = 260;
const MOCK_HISTORY_INTERVAL_MS = 45 * 1000;
const MOCK_HISTORY_BASE_TS = Date.parse('2026-03-01T08:00:00.000Z');

let mockSessionSerial = 3;
let mockSessions: ChatSession[] = [
  {
    id: 'mock-session-1',
    user_id: 'mock-user',
    title: '项目需求讨论',
    is_pinned: false,
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-08T09:00:00Z',
  },
  {
    id: 'mock-session-2',
    user_id: 'mock-user',
    title: '接口联调记录',
    is_pinned: false,
    created_at: '2026-04-07T10:00:00Z',
    updated_at: '2026-04-07T10:00:00Z',
  },
  {
    id: 'mock-session-3',
    user_id: 'mock-user',
    title: '代码评审',
    is_pinned: false,
    created_at: '2026-04-06T11:00:00Z',
    updated_at: '2026-04-06T11:00:00Z',
  },
];

const buildMockHistoryMessages = (sessionId: string, total: number): MessageResponse[] => {
  return Array.from({ length: total }, (_, index) => {
    const messageNo = index + 1;
    const messageSeq = String(messageNo).padStart(4, '0');
    const isUser = messageNo % 2 === 1;
    const round = Math.ceil(messageNo / 2);
    const createdAt = new Date(
      MOCK_HISTORY_BASE_TS + index * MOCK_HISTORY_INTERVAL_MS
    ).toISOString();

    const role: MessageResponse['role'] = isUser ? 'user' : 'assistant';

    return {
      id: `${sessionId}-msg-${messageSeq}`,
      role,
      model_id: isUser ? null : 'mock-system-1',
      content: isUser
        ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
        : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`,
      tool_calls: null,
      created_at: createdAt,
    };
  });
};

let mockHistoryMessagesBySessionId: Record<string, MessageResponse[]> = mockSessions.reduce<
  Record<string, MessageResponse[]>
>((acc, session) => {
  acc[session.id] = buildMockHistoryMessages(session.id, MOCK_HISTORY_SIZE);
  return acc;
}, {});

const createSession: IChatService['createSession'] = async (params) => {
  mockSessionSerial += 1;
  const now = nowIso();
  const session: ChatSession = {
    id: `mock-session-${mockSessionSerial}`,
    user_id: 'mock-user',
    title: params?.title?.trim() ? params.title : 'New Chat',
    is_pinned: false,
    created_at: now,
    updated_at: now,
  };
  mockSessions = [session, ...mockSessions];
  mockHistoryMessagesBySessionId = {
    ...mockHistoryMessagesBySessionId,
    [session.id]: [],
  };
  return session;
};

const renameSession: IChatService['renameSession'] = async (params) => {
  const now = nowIso();
  const target = mockSessions.find((session) => session.id === params.sessionId);
  const renamed: ChatSession = {
    id: params.sessionId,
    user_id: target?.user_id ?? 'mock-user',
    title: params.newTitle?.trim() ? params.newTitle : 'New Chat',
    is_pinned: target?.is_pinned ?? false,
    created_at: target?.created_at ?? now,
    updated_at: now,
  };

  mockSessions = mockSessions.map((session) =>
    session.id === params.sessionId ? renamed : session
  );
  return renamed;
};

const deleteSession: IChatService['deleteSession'] = async (params) => {
  mockSessions = mockSessions.filter((session) => session.id !== params.sessionId);
  const { [params.sessionId]: _removed, ...rest } = mockHistoryMessagesBySessionId;
  mockHistoryMessagesBySessionId = rest;
};

const listSessions: IChatService['listSessions'] = async (params?: ListSessionsRequest) => {
  const page = Math.max(1, params?.page ?? 1);
  const size = Math.max(1, params?.size ?? 20);
  const start = (page - 1) * size;
  const end = start + size;
  const sortedSessions = [...mockSessions].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const total = sortedSessions.length;
  const list = sortedSessions.slice(start, end);

  const result: PageResult<ChatSession> = {
    list,
    total,
    page,
    size,
    totalPage: Math.ceil(total / size),
  };
  return result;
};

const listHistoryMessages: IChatService['listHistoryMessages'] = async (
  params: ListHistoryMessagesRequest
) => {
  const page = Math.max(1, params.page ?? 1);
  const size = Math.max(1, params.size ?? 20);
  const allMessages = mockHistoryMessagesBySessionId[params.sessionId] ?? [];
  const total = allMessages.length;

  const end = Math.max(0, total - (page - 1) * size);
  const start = Math.max(0, end - size);
  const list = allMessages.slice(start, end);
  const totalPage = Math.ceil(total / size);

  return {
    list,
    total,
    page,
    size,
    totalPage,
  };
};

const getWorkspace: IChatService['getWorkspace'] = async () => {
  return {
    groups: [
      {
        groupId: '1',
        groupName: '示例小组',
        groupType: 2,
        groupDesc: '',
        groupCoverUrl: '',
        memberCount: 5,
        ownerId: '1',
        createTime: '',
        inviteCode: '',
        tokenUsed: 0,
        tokenBalance: 0,
      },
      {
        groupId: '2',
        groupName: '前端开发组',
        groupType: 2,
        groupDesc: '',
        groupCoverUrl: '',
        memberCount: 12,
        ownerId: '1',
        createTime: '',
        inviteCode: '',
        tokenUsed: 0,
        tokenBalance: 0,
      },
    ] as Group[],
    skills: [
      {
        skillId: 'skill-personal-translation',
        displayName: '翻译助手',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-personal-summary',
        displayName: '文档总结',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-personal-math',
        displayName: '数学计算',
        description: '',
        scopeType: 'PERSONAL' as const,
      },
      {
        skillId: 'skill-group-1-weekly',
        displayName: '团队周报生成',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '1',
        groupName: '示例小组',
      },
      {
        skillId: 'skill-group-1-tracker',
        displayName: '项目进度追踪',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '1',
        groupName: '示例小组',
      },
      {
        skillId: 'skill-group-2-component',
        displayName: '组件生成器',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '2',
        groupName: '前端开发组',
      },
      {
        skillId: 'skill-group-2-lint',
        displayName: '样式检查',
        description: '',
        scopeType: 'GROUP' as const,
        groupId: '2',
        groupName: '前端开发组',
      },
    ],
    personalAgents: [
      {
        agentId: 'agent-custom-translation',
        agentType: 'PERSONAL' as const,
        label: '翻译助手Agent',
        isDefault: false,
        defaultSkillIds: ['skill-personal-translation', 'skill-personal-codereview'],
      },
      {
        agentId: 'agent-custom-writing',
        agentType: 'PERSONAL' as const,
        label: '写作Agent',
        isDefault: false,
        defaultSkillIds: ['skill-personal-summary'],
      },
    ],
    groupAgents: [
      {
        agentId: 'agent-group-1-design',
        agentType: 'GROUP' as const,
        label: '设计评审Agent',
        groupId: '1',
        groupName: '示例小组',
        isDefault: false,
        defaultSkillIds: ['skill-group-1-weekly'],
      },
    ],
  };
};

const getTools = async (): Promise<ToolOption[]> => {
  return [
    { toolId: 'search_historical_messages', label: 'Search History' },
    { toolId: 'mock-tool-2', label: 'Mock Tool 2' },
  ];
};

const uploadAttachment = async ({
  file,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        attachmentId: 'mock-attachment-' + Date.now(),
        filename: file.name,
      });
    }, 500);
  });
};
export const ChatServicesMock: IChatService = {
  getWorkspace,
  getModels,
  createSession,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
  getTools,
  uploadAttachment,
};

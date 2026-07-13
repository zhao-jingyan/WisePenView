import type { Doc } from 'yjs';

import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import type {
  AiDiffDisplayMode,
  NoteCommentUserDisplayRecord,
  NoteSelectionSnapshot,
  WisepenProvider,
} from '@/domains/Note';
import type { User } from '@/domains/User';
import type { BlockNoteCommentDocumentRole } from './comments/comments.types';
import type { CollaboratorCommentVisibility } from './comments/core/commentSettings';

export interface NoteBodyEditorHandle {
  focus: () => void;
  navigateToBlock: (id: string) => void;
  /** 通过系统打印对话框另存为 PDF（克隆 DOM + 打印前临时仅旧文本） */
  exportPdf: (options?: { title?: string; titleRoot?: HTMLElement | null }) => Promise<void>;
  /** 导出正文 Markdown artifact（AIDiff 按仅旧文本投影） */
  exportMarkdown: () => NoteMarkdownArtifact;
}

export interface NoteMarkdownArtifact {
  content: string;
  mimeType: 'text/markdown;charset=utf-8';
  extension: 'md';
}

export interface NoteCollaborationUser {
  name: string;
  color: string;
}

export interface NoteCollaborationBinding {
  doc: Doc;
  provider: WisepenProvider;
  user: NoteCollaborationUser;
  /** 协同 provider 已完成首次服务端同步，此后才允许写入待导入正文 */
  ready: boolean;
}

export interface NoteEditorState {
  aiDiffDisplayMode: AiDiffDisplayMode;
  /** UI/editable：连接中或无 EDIT 时为 true */
  readOnly: boolean;
  /**
   * PM 层拦截本地改 doc：仅「已连接且无协同编辑权」时为 true。
   * 连接中须为 false，否则 filter 会拦 BlockNote 初始化（Block doesn't have id）。
   */
  blockLocalDocWrites: boolean;
}

export interface NoteCommentsConfig {
  /**
   * 是否挂载批注 schema/扩展（与笔记是否开启批注能力一致，不受连接状态影响）。
   * 连接中也必须为 true，否则 y-prosemirror 无法解析 Yjs 中的 comment mark，会删除正文。
   */
  enabled: boolean;
  /** 是否展示批注 UI（侧栏、历史等）；通常仅在协同已连接时为 true */
  uiEnabled: boolean;
  /**
   * 用户是否具备批注编辑权限（来自服务端，不受连接状态影响）。
   * 用于初始化 threadStoreAuth，避免连接前挂载编辑器后权限被锁死在只读。
   */
  authorizable: boolean;
  /** 当前是否允许创建/回复/解决批注（通常需已连接且具备权限） */
  writable: boolean;
  /** 页面已加载的当前用户，作为批注 actor；不在编辑器内重复请求。 */
  actor?: User;
  usersById?: NoteCommentUserDisplayRecord;
  documentRole?: BlockNoteCommentDocumentRole;
  visibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
  sidebar: {
    collapsed: boolean;
    width: number;
    onWidthChange: (width: number) => void;
  };
  history: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
}

export interface NotePortalContainers {
  commentsSidebar: HTMLElement | null;
  aiBulkActions: HTMLElement | null;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  collaboration: NoteCollaborationBinding;
  state: NoteEditorState;
  comments: NoteCommentsConfig;
  portalContainers: NotePortalContainers;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
  onAiDiffPresenceChange?: (hasAiDiffContent: boolean) => void;
  onAskAi: (context: NoteSelectionSnapshot) => void;
  onAiDiffBodyContentHashChange?: (hash: string | undefined) => void;
}

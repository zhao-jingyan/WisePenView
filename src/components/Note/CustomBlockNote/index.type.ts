import type { Doc } from 'yjs';

import type {
  AiDiffDisplayMode,
  NoteAiDiffPreviewData,
  NoteInlineCommentUserDisplayRecord,
  NoteSelectionSnapshot,
  WisepenProvider,
} from '@/domains/Note';
import type { User } from '@/domains/User';
import type { NoteOutlineItem } from './content/outline';
import type { BlockNoteInlineCommentDocumentRole } from './engines/inlineComment/threads/auth';
import type { CollaboratorInlineCommentVisibility } from './engines/inlineComment/visibility/document';

export interface NoteBodyEditorHandle {
  focus: () => void;
  navigateToBlock: (id: string) => void;
  /** 通过系统打印对话框另存为 PDF（克隆 DOM + 打印前临时仅旧文本） */
  exportPdf: (options?: { title?: string; titleRoot?: HTMLElement | null }) => Promise<void>;
  /** 导出正文 Markdown artifact（AIDiff 按仅旧文本投影） */
  exportMarkdown: () => NoteMarkdownArtifact;
}

interface NoteMarkdownArtifact {
  content: string;
  mimeType: 'text/markdown;charset=utf-8';
  extension: 'md';
}

export interface NoteCollaborationUser {
  name: string;
  color: string;
}

interface NoteCollaborationBinding {
  doc: Doc;
  provider: WisepenProvider;
  user: NoteCollaborationUser;
  /** 协同 provider 已完成首次服务端同步，此后才允许写入待导入正文 */
  ready: boolean;
}

interface NoteEditorState {
  aiDiffDisplayMode: AiDiffDisplayMode;
  /** UI/editable：连接中或无 EDIT 时为 true */
  readOnly: boolean;
  /**
   * PM 层拦截本地改 doc：仅「已连接且无协同编辑权」时为 true。
   * 连接中须为 false，否则 filter 会拦 BlockNote 初始化（Block doesn't have id）。
   */
  blockLocalDocWrites: boolean;
}

export type NoteInlineCommentStatus =
  | { kind: 'disabled' }
  | { kind: 'connecting'; hasWritePermission: boolean }
  | { kind: 'readOnly' }
  | { kind: 'writable' };

interface NoteInlineCommentConfig {
  /** 连接中仍挂载 schema，并保留服务端写权限供线程权限初始化。 */
  status: NoteInlineCommentStatus;
  /** 页面已加载的当前用户，作为批注 actor；不在编辑器内重复请求。 */
  actor?: User;
  usersById?: NoteInlineCommentUserDisplayRecord;
  documentRole: BlockNoteInlineCommentDocumentRole;
  visibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorInlineCommentVisibility;
  onOpen: () => void;
  history: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
}

interface NotePortalContainers {
  inlineCommentSidebar: HTMLElement | null;
  aiBulkActions: HTMLElement | null;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  collaboration: NoteCollaborationBinding;
  state: NoteEditorState;
  aiDiffPreview?: NoteAiDiffPreviewData;
  inlineComment: NoteInlineCommentConfig;
  portalContainers: NotePortalContainers;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
  onAiDiffPresenceChange?: (hasAiDiffContent: boolean) => void;
  onAskAi: (context: NoteSelectionSnapshot) => void;
  onAiDiffBodyContentHashChange?: (hash: string | undefined) => void;
}

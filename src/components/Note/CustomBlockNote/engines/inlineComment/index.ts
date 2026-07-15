/**
 * 批注模块对外入口。仅 re-export 编辑器 / 笔记页实际引用的符号；
 * 内部实现请从相对路径直接导入。
 */
export { getBlockNoteCommentUsersYMap, getBlockNoteThreadsYMap } from './threads/yjs';

export {
  resolveActiveInlineCommentUserProfile,
  resolveBlockNoteInlineCommentUsers,
} from './threads/users';

export { buildInlineCommentExtension } from './runtime/buildInlineCommentExtension';

export { NoteInlineCommentUi } from './ui/NoteInlineCommentUi';

export { NoteInlineCommentRuntimeProvider } from './runtime/InlineCommentRuntime';
export { resolveNoteInlineCommentRuntimeState } from './runtime/state';
export { useContentInlineComments } from './runtime/useContentInlineComments';

export {
  capturePendingInlineCommentSelection,
  type PendingInlineCommentReference,
  type PendingInlineCommentSelection,
} from './anchors/pendingInlineComment';
export { syncDomSelectionToProseMirror } from './anchors/range';
export { isInlineCommentableSelection, shouldHideNoteFormattingToolbar } from './anchors/selection';

export { useSyncInlineCommentDocumentMarks } from './anchors/useInlineCommentDocumentMarksSync';
export { useRemoteInlineCommentSync } from './threads/useRemoteInlineCommentSync';
export { useDocumentInlineCommentVisibility } from './visibility/useDocumentInlineCommentVisibility';

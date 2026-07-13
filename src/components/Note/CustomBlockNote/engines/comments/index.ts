/**
 * 批注模块对外入口。仅 re-export 编辑器 / 笔记页实际引用的符号；
 * 内部实现请从相对路径直接导入。
 */
export { getBlockNoteCommentUsersYMap, getBlockNoteThreadsYMap } from './threads/yjs';

export { resolveActiveCommentUserProfile, resolveBlockNoteCommentUsers } from './threads/users';

export { buildCommentsExtension } from './runtime/buildCommentsExtension';

export { NoteCommentsUi } from './ui/NoteCommentsUi';

export { NoteCommentRuntimeProvider } from './runtime/CommentRuntime';
export { resolveNoteCommentsRuntimeState } from './runtime/state';
export { useContentComments } from './runtime/useContentComments';

export {
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './anchors/pending';
export { syncDomSelectionToProseMirror } from './anchors/range';
export { isCommentableSelection, shouldHideNoteFormattingToolbar } from './anchors/selection';

export { useSyncCommentDocumentMarks } from './anchors/useDocumentMarksSync';
export { useRemoteCommentSync } from './threads/useRemoteCommentSync';
export { useDocumentCommentVisibility } from './visibility/useDocumentVisibility';

/**
 * 批注模块对外入口。仅 re-export 编辑器 / 笔记页实际引用的符号；
 * 内部实现请从相对路径直接导入。
 */
export {
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
} from './core/commentThreadConstants';

export { isCommentableSelection } from './core/isCommentableSelection';

export {
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
} from './core/commentUserProfile';

export { buildCommentsExtension } from './hooks/useCommentsExtension';

export { NoteCommentsUi } from './ui/NoteCommentsUi';

export { LatexCommentProvider, useFormulaComments } from '../plugins/LatexPlugin/comments';

export { syncDomSelectionToProseMirror } from './core/commentDocumentMarks';
export {
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './core/pendingCommentReference';

export { useActiveCommentUser } from './hooks/useActiveCommentUser';
export { useCommentSettingsSync } from './hooks/useCommentSettingsSync';
export { useInlineCommentsSync } from './hooks/useInlineCommentsSync';
export { useSyncCommentDocumentMarks } from './hooks/useSyncCommentDocumentMarks';

export { default as commentStyles } from './ui/commentStyles.module.less';

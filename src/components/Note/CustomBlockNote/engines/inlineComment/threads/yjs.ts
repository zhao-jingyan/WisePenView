import type { ThreadData } from '@blocknote/core/comments';
import type { Doc } from 'yjs';

/**
 * Yjs Y.Map 键名，与 BlockNote
 * [YjsThreadStore](https://www.blocknotejs.org/docs/features/collaboration/comments#yjsthreadstore) 示例一致。
 */
const BLOCKNOTE_YJS_THREADS_MAP = 'threads' as const;
const BLOCKNOTE_YJS_THREAD_REFERENCES_MAP = 'thread-references' as const;
const BLOCKNOTE_YJS_COMMENT_USERS_MAP = 'comment-users' as const;

export function getBlockNoteThreadsYMap(doc: Doc) {
  return doc.getMap(BLOCKNOTE_YJS_THREADS_MAP);
}

export function getBlockNoteThreadReferencesYMap(doc: Doc) {
  return doc.getMap<string>(BLOCKNOTE_YJS_THREAD_REFERENCES_MAP);
}

export function getBlockNoteCommentUsersYMap(doc: Doc) {
  return doc.getMap<{ username: string; avatarUrl: string }>(BLOCKNOTE_YJS_COMMENT_USERS_MAP);
}

/** thread 仍存在且未删除即可保留锚点/高亮；resolved 只影响侧栏筛选，不销毁 sidecar。 */
export function isThreadActive(thread: ThreadData | undefined): boolean {
  return Boolean(thread && !thread.deletedAt);
}

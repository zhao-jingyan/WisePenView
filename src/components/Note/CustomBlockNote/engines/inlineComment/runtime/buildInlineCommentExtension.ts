import type { ExtensionFactoryInstance } from '@blocknote/core';
import { CommentMark, CommentsExtension } from '@blocknote/core/comments';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  CONTENT_INLINE_COMMENT_YJS_ORIGIN,
  getContentInlineCommentAnchorStores,
} from '../anchors/content';
import type { PendingInlineCommentSelection } from '../anchors/pendingInlineComment';
import {
  getBlockNoteThreadDocumentSelectionsYMap,
  persistThreadDocumentSelection,
  WISEPEN_INLINE_COMMENT_MARK_SYNC_META,
} from '../anchors/range';
import { isDocumentThreadRangeAllowed } from '../anchors/selection';
import type { BlockNoteInlineCommentDocumentRole } from '../threads/auth';
import { ReadOnlyThreadStoreAuth, WisePenThreadStoreAuth } from '../threads/auth';
import {
  RemoteInlineCommentThreadStore,
  type RemoteInlineCommentDataSource,
} from '../threads/RemoteInlineCommentThreadStore';
import { getBlockNoteThreadReferencesYMap } from '../threads/yjs';

type AddThreadToDocumentArgs = {
  threadId: string;
  selection?: {
    prosemirror?: {
      anchor?: number;
      head?: number;
    };
  };
};

function addInlineCommentMarkToDocumentSelection(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  { threadId, selection }: AddThreadToDocumentArgs
): { from: number; to: number } | null {
  const anchor = selection?.prosemirror?.anchor;
  const head = selection?.prosemirror?.head;
  if (typeof anchor !== 'number' || typeof head !== 'number' || anchor === head) {
    return null;
  }

  const from = Math.max(0, Math.min(anchor, head));
  const to = Math.min(editor.prosemirrorView.state.doc.content.size, Math.max(anchor, head));
  if (from >= to) {
    return null;
  }

  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return null;
  }

  if (!isDocumentThreadRangeAllowed(editor, registry, from, to)) {
    return null;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_INLINE_COMMENT_MARK_SYNC_META, true);
    tr.addMark(from, to, markType.create({ threadId, orphan: false }));
  });

  return { from, to };
}

type BuildInlineCommentExtensionOptions = {
  registry: NotePluginRegistry;
  resourceId: string;
  getActiveCommentUserId: () => string;
  /** 用户是否具备批注写权限，不受连接状态影响。 */
  hasWritePermission: boolean;
  isInlineCommentVisibilityPrivileged: boolean;
  inlineCommentDocumentRole: BlockNoteInlineCommentDocumentRole;
  threadsYMap: Y.Map<unknown>;
  resolveUsers: (
    userIds: string[]
  ) => Promise<Array<{ id: string; username: string; avatarUrl: string }>>;
  getEditor: () => CustomBlockNoteEditor | null;
  doc: Doc;
  getPendingInlineCommentSelection: () => PendingInlineCommentSelection | null | undefined;
  getPendingInlineCommentReferenceText: () => string | undefined;
  clearPendingInlineCommentSelection: () => void;
  onThreadDocumentMarked: (threadId: string) => void;
  canAddThreadToDocument: (editor: CustomBlockNoteEditor) => boolean;
  inlineCommentDataSource: RemoteInlineCommentDataSource;
};

function resolveThreadDocumentSelection(
  args: AddThreadToDocumentArgs,
  getPendingInlineCommentSelection: () => PendingInlineCommentSelection | null | undefined
): AddThreadToDocumentArgs['selection'] {
  const anchor = args.selection?.prosemirror?.anchor;
  const head = args.selection?.prosemirror?.head;
  if (typeof anchor === 'number' && typeof head === 'number' && anchor !== head) {
    return args.selection;
  }

  const pending = getPendingInlineCommentSelection();
  if (!pending) {
    return args.selection;
  }

  return {
    ...args.selection,
    prosemirror: pending,
  };
}

function deleteThreadSidecarData(doc: Doc, registry: NotePluginRegistry, threadId: string): void {
  doc.transact(() => {
    getBlockNoteThreadReferencesYMap(doc).delete(threadId);
    getBlockNoteThreadDocumentSelectionsYMap(doc).delete(threadId);
    getContentInlineCommentAnchorStores(doc, registry).forEach((store) => store.delete(threadId));
  }, CONTENT_INLINE_COMMENT_YJS_ORIGIN);
}

export function buildInlineCommentExtension(
  options: BuildInlineCommentExtensionOptions
): ExtensionFactoryInstance {
  const {
    registry,
    resourceId,
    getActiveCommentUserId,
    hasWritePermission,
    isInlineCommentVisibilityPrivileged,
    inlineCommentDocumentRole,
    threadsYMap,
    resolveUsers,
    getEditor,
    doc,
    getPendingInlineCommentSelection,
    getPendingInlineCommentReferenceText,
    clearPendingInlineCommentSelection,
    onThreadDocumentMarked,
    canAddThreadToDocument,
    inlineCommentDataSource,
  } = options;

  const threadStoreAuth = hasWritePermission
    ? new WisePenThreadStoreAuth(
        getActiveCommentUserId,
        inlineCommentDocumentRole,
        isInlineCommentVisibilityPrivileged
      )
    : new ReadOnlyThreadStoreAuth();

  const threadStore = new RemoteInlineCommentThreadStore({
    resourceId,
    threadsYMap,
    dataSource: inlineCommentDataSource,
    getActiveCommentUserId,
    getPendingReferenceText: getPendingInlineCommentReferenceText,
    auth: threadStoreAuth,
    onThreadEmpty: (threadId) => deleteThreadSidecarData(doc, registry, threadId),
    addThreadToDocument: async (args) => {
      const editor = getEditor();
      if (!editor) {
        return;
      }
      const resolvedSelection = resolveThreadDocumentSelection(
        args,
        getPendingInlineCommentSelection
      );
      const resolvedPm = resolvedSelection?.prosemirror;
      const hasValidRange =
        typeof resolvedPm?.anchor === 'number' &&
        typeof resolvedPm?.head === 'number' &&
        resolvedPm.anchor !== resolvedPm.head;
      if (!hasValidRange && !canAddThreadToDocument(editor)) {
        onThreadDocumentMarked(args.threadId);
        return;
      }
      const appliedRange = addInlineCommentMarkToDocumentSelection(editor, registry, {
        threadId: args.threadId,
        selection: resolvedSelection,
      });
      if (appliedRange) {
        persistThreadDocumentSelection(
          editor,
          doc,
          args.threadId,
          appliedRange.from,
          appliedRange.to
        );
      }
      onThreadDocumentMarked(args.threadId);
      clearPendingInlineCommentSelection();
    },
  });

  return CommentsExtension({
    threadStore,
    resolveUsers,
  });
}

import type { CommentData } from '@blocknote/core/comments';
import { FloatingComposerController } from '@blocknote/react';
import { useMemoizedFn, useMount, useUnmount } from 'ahooks';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import type { WisePenCommentAuthorInfo } from '@/components/CommentsSidebar';
import { ResizableCommentsSidebar } from '@/components/CommentsSidebar';
import type { NoteCommentUserDisplayRecord } from '@/domains/Note';
import type { NoteCommentPosition, NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  getContentCommentAnchorStores,
  isContentCommentSyncing,
  isContentCommentYjsTransaction,
} from '../anchors/content';
import { getThreadComments } from '../threads/presentation';
import { isPlaceholderCommentUserId, normalizeAvatarUrl } from '../threads/users';
import { getBlockNoteCommentUsersYMap, getBlockNoteThreadsYMap } from '../threads/yjs';
import type { CollaboratorCommentVisibility } from '../visibility/document';
import type { ThreadVisibilityScope } from '../visibility/filter';
import CommentHistoryModal from './CommentHistoryModal';
import commentStyles from './commentStyles.module.less';
import { CustomThreadsSidebar } from './threadsSidebar/CustomThreadsSidebar';

const UNKNOWN_COMMENT_USER_NAME = '未知用户';
const CURRENT_COMMENT_USER_NAME = '当前用户';

type RawCommentAuthorInfo = {
  id?: string;
  name?: string;
  username?: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  avatarUrl?: string;
};

function trimDisplayValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function pickSafeDisplayName(candidates: Array<string | undefined>, userId: string): string {
  const trimmedUserId = userId.trim();
  return (
    candidates
      .map((candidate) => trimDisplayValue(candidate))
      .find(
        (candidate) =>
          candidate && candidate !== trimmedUserId && !isPlaceholderCommentUserId(candidate)
      ) || ''
  );
}

function readCommentAuthorInfo(comment: CommentData): RawCommentAuthorInfo | undefined {
  const metadata = comment.metadata as { authorInfo?: RawCommentAuthorInfo } | undefined;
  return metadata?.authorInfo;
}

type NoteCommentsUiProps = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  registry: NotePluginRegistry;
  commentsWritable: boolean;
  commentUserId: string;
  commentUsername: string;
  commentAvatarUrl: string;
  commentUsersById?: NoteCommentUserDisplayRecord;
  isCommentVisibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  sidebarPortalContainer: HTMLElement | null;
  commentHistoryOpen: boolean;
  onCommentHistoryOpenChange: (open: boolean) => void;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  contentThreadPositions: Map<string, NoteCommentPosition>;
  onBumpThreadsSidebar: () => void;
};

export function NoteCommentsUi({
  editor,
  doc,
  registry,
  commentsWritable,
  commentUserId,
  commentUsername,
  commentAvatarUrl,
  commentUsersById,
  isCommentVisibilityPrivileged,
  collaboratorVisibility,
  sidebarCollapsed,
  sidebarWidth,
  onSidebarWidthChange,
  sidebarPortalContainer,
  commentHistoryOpen,
  onCommentHistoryOpenChange,
  localThreadReferenceTexts,
  contentThreadPositions,
  onBumpThreadsSidebar,
}: NoteCommentsUiProps) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const contentAnchorStores = getContentCommentAnchorStores(doc, registry);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const detachListenersRef = useRef<(() => void) | null>(null);

  const visibilityScope: ThreadVisibilityScope = {
    currentUserId: commentUserId,
    isPrivileged: isCommentVisibilityPrivileged,
    collaboratorVisibility,
  };
  const canReopenThread = (thread: Parameters<typeof getThreadComments>[0]) =>
    isCommentVisibilityPrivileged || getThreadComments(thread)[0]?.userId === commentUserId;
  const resolveCommentAuthor = useMemoizedFn((comment: CommentData): WisePenCommentAuthorInfo => {
    const authorInfo = readCommentAuthorInfo(comment);
    const userId = trimDisplayValue(comment.userId) || trimDisplayValue(authorInfo?.id);
    const metadataName = pickSafeDisplayName(
      [authorInfo?.name, authorInfo?.nickname, authorInfo?.realName, authorInfo?.username],
      userId
    );
    const metadataAvatarUrl = normalizeAvatarUrl(authorInfo?.avatarUrl || authorInfo?.avatar);
    const isCurrentUser =
      userId === commentUserId || (userId ? isPlaceholderCommentUserId(userId) : false);

    if (isCurrentUser) {
      return {
        id: commentUserId,
        name: pickSafeDisplayName([commentUsername], commentUserId) || CURRENT_COMMENT_USER_NAME,
        avatarUrl: commentAvatarUrl || metadataAvatarUrl,
      };
    }

    const syncedUser = userId ? commentUsersYMap.get(userId) : undefined;
    if (syncedUser) {
      return {
        id: userId,
        name:
          pickSafeDisplayName([syncedUser.username], userId) ||
          metadataName ||
          UNKNOWN_COMMENT_USER_NAME,
        avatarUrl: syncedUser.avatarUrl || metadataAvatarUrl,
      };
    }

    const knownUser = userId ? commentUsersById?.[userId] : undefined;
    if (knownUser) {
      return {
        id: userId,
        name:
          pickSafeDisplayName([knownUser.name], userId) ||
          metadataName ||
          UNKNOWN_COMMENT_USER_NAME,
        avatarUrl: normalizeAvatarUrl(knownUser.avatar) || metadataAvatarUrl,
      };
    }

    return {
      id: userId,
      name: metadataName || UNKNOWN_COMMENT_USER_NAME,
      avatarUrl: metadataAvatarUrl,
    };
  });

  useMount(() => {
    const handleTransaction = (transaction: Y.Transaction) => {
      if (isContentCommentYjsTransaction(transaction.origin)) {
        return;
      }
      const changed = transaction.changed as unknown as Map<unknown, unknown>;
      const threadsChanged = changed.has(threadsYMap);
      const anchorsChanged = contentAnchorStores.some((store) => changed.has(store));
      if (!threadsChanged && !anchorsChanged) {
        return;
      }
      if (isContentCommentSyncing(doc)) {
        return;
      }
      onBumpThreadsSidebar();
    };

    doc.on('afterTransaction', handleTransaction);
    detachListenersRef.current = () => {
      doc.off('afterTransaction', handleTransaction);
      detachListenersRef.current = null;
    };
  });

  useUnmount(() => {
    detachListenersRef.current?.();
  });

  const historySidebar = (
    <CustomThreadsSidebar
      editor={editor}
      doc={doc}
      localThreadReferenceTexts={localThreadReferenceTexts}
      contentThreadPositions={contentThreadPositions}
      visibilityScope={visibilityScope}
      filter="resolved"
      sort="recent-activity"
      maxCommentsBeforeCollapse={5}
      actionMode="history"
      canReopenThread={canReopenThread}
      actionsEnabled={false}
      resolveCommentAuthor={resolveCommentAuthor}
    />
  );
  const sidebarPanel = !sidebarCollapsed ? (
    <ResizableCommentsSidebar width={sidebarWidth} onWidthChange={onSidebarWidthChange}>
      <CustomThreadsSidebar
        editor={editor}
        doc={doc}
        localThreadReferenceTexts={localThreadReferenceTexts}
        contentThreadPositions={contentThreadPositions}
        visibilityScope={visibilityScope}
        filter="open"
        sort="position"
        maxCommentsBeforeCollapse={5}
        actionsEnabled={commentsWritable}
        resolveCommentAuthor={resolveCommentAuthor}
      />
    </ResizableCommentsSidebar>
  ) : null;
  const renderedSidebarPanel =
    sidebarPortalContainer && sidebarPanel
      ? createPortal(sidebarPanel, sidebarPortalContainer)
      : null;

  return (
    <>
      {commentsWritable ? (
        <FloatingComposerController
          floatingUIOptions={{
            elementProps: {
              className: commentStyles.floatingCommentComposer,
            },
          }}
        />
      ) : null}
      {renderedSidebarPanel}
      <CommentHistoryModal isOpen={commentHistoryOpen} onOpenChange={onCommentHistoryOpenChange}>
        <div className={commentStyles.historyThreadsSurface}>{historySidebar}</div>
      </CommentHistoryModal>
    </>
  );
}

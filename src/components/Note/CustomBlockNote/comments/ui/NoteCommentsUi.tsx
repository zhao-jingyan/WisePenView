import type { CommentData } from '@blocknote/core/comments';
import { FloatingComposerController } from '@blocknote/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import type { WisePenCommentAuthorInfo } from '@/components/CommentsSidebar';
import type { NoteCommentUserDisplayRecord } from '@/domains/Note';
import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import {
  isFormulaCommentSyncing,
  isWisePenFormulaYjsTransaction,
} from '../core/commentDocumentMarks';
import type { CollaboratorCommentVisibility } from '../core/commentSettings';
import {
  getBlockNoteCommentUsersYMap,
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadsYMap,
} from '../core/commentThreadConstants';
import {
  isPlaceholderCommentUserId,
  normalizeAvatarUrl,
  syncCommentUserProfileToYMap,
} from '../core/commentUserProfile';
import { getThreadComments, type ThreadPosition } from '../core/threadReferenceText';
import type { ThreadVisibilityContext } from '../core/threadVisibility';
import CommentHistoryModal from './CommentHistoryModal';
import { CommentsSidebarPanel } from './CommentsSidebarPanel';
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
  commentsEnabled: boolean;
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
  sidebarPortalContainer?: HTMLElement | null;
  commentHistoryOpen: boolean;
  onCommentHistoryOpenChange: (open: boolean) => void;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  formulaThreadPositions: Map<string, ThreadPosition>;
  onBumpThreadsSidebar: () => void;
};

export function NoteCommentsUi({
  editor,
  doc,
  commentsEnabled,
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
  formulaThreadPositions,
  onBumpThreadsSidebar,
}: NoteCommentsUiProps) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const formulaAnchorsYMap = getBlockNoteFormulaThreadAnchorsYMap(doc);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const detachListenersRef = useRef<(() => void) | null>(null);

  const visibilityContext: ThreadVisibilityContext = {
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
    if (!commentsEnabled) {
      return;
    }

    syncCommentUserProfileToYMap(commentUsersYMap, commentUserId, {
      username: commentUsername,
      avatarUrl: commentAvatarUrl,
    });

    const handleTransaction = (transaction: Y.Transaction) => {
      if (isWisePenFormulaYjsTransaction(transaction.origin)) {
        return;
      }
      const changed = transaction.changed as unknown as Map<unknown, unknown>;
      const threadsChanged = changed.has(threadsYMap);
      const anchorsChanged = changed.has(formulaAnchorsYMap);
      if (!threadsChanged && !anchorsChanged) {
        return;
      }
      if (isFormulaCommentSyncing) {
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

  useUpdateEffect(() => {
    if (!commentsEnabled) {
      return;
    }
    syncCommentUserProfileToYMap(commentUsersYMap, commentUserId, {
      username: commentUsername,
      avatarUrl: commentAvatarUrl,
    });
  }, [commentAvatarUrl, commentUserId, commentUsername, commentUsersYMap, commentsEnabled]);

  useUnmount(() => {
    detachListenersRef.current?.();
  });

  if (!commentsEnabled) {
    return null;
  }

  const historySidebar = (
    <CustomThreadsSidebar
      editor={editor}
      doc={doc}
      localThreadReferenceTexts={localThreadReferenceTexts}
      formulaThreadPositions={formulaThreadPositions}
      visibilityContext={visibilityContext}
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
    <CommentsSidebarPanel width={sidebarWidth} onWidthChange={onSidebarWidthChange}>
      <CustomThreadsSidebar
        editor={editor}
        doc={doc}
        localThreadReferenceTexts={localThreadReferenceTexts}
        formulaThreadPositions={formulaThreadPositions}
        visibilityContext={visibilityContext}
        filter="open"
        sort="position"
        maxCommentsBeforeCollapse={5}
        actionsEnabled={commentsWritable}
        resolveCommentAuthor={resolveCommentAuthor}
      />
    </CommentsSidebarPanel>
  ) : null;
  const renderedSidebarPanel =
    sidebarPortalContainer === undefined
      ? sidebarPanel
      : sidebarPortalContainer && sidebarPanel
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

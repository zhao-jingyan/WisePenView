import type { CommentData } from '@blocknote/core/comments';
import { FloatingComposerController } from '@blocknote/react';
import { useMemoizedFn, useMount, useUnmount } from 'ahooks';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import type { NoteInlineCommentUserDisplayRecord } from '@/domains/Note';
import type { WisePenInlineCommentAuthorInfo } from '@/views/workspace/note/_components/InlineCommentSidebar';
import type { NoteInlineCommentPosition, NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  getContentInlineCommentAnchorStores,
  isContentInlineCommentSyncing,
  isContentInlineCommentYjsTransaction,
} from '../anchors/content';
import { getThreadInlineComments } from '../threads/presentation';
import { isPlaceholderInlineCommentUserId, normalizeAvatarUrl } from '../threads/users';
import { getBlockNoteCommentUsersYMap, getBlockNoteThreadsYMap } from '../threads/yjs';
import type { CollaboratorInlineCommentVisibility } from '../visibility/document';
import type { InlineCommentVisibilityScope } from '../visibility/filter';
import InlineCommentHistoryModal from './InlineCommentHistoryModal';
import inlineCommentStyles from './inlineCommentStyles.module.less';
import { InlineCommentThreadsSidebar } from './threadsSidebar/InlineCommentThreadsSidebar';

const UNKNOWN_INLINE_COMMENT_USER_NAME = '未知用户';
const CURRENT_INLINE_COMMENT_USER_NAME = '当前用户';

type RawInlineCommentAuthorInfo = {
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
          candidate && candidate !== trimmedUserId && !isPlaceholderInlineCommentUserId(candidate)
      ) || ''
  );
}

function readInlineCommentAuthorInfo(comment: CommentData): RawInlineCommentAuthorInfo | undefined {
  const metadata = comment.metadata as { authorInfo?: RawInlineCommentAuthorInfo } | undefined;
  return metadata?.authorInfo;
}

function readReactionUserInfo(
  comment: CommentData,
  userId: string
): RawInlineCommentAuthorInfo | undefined {
  const metadata = comment.metadata as
    { reactionUserInfoById?: Record<string, RawInlineCommentAuthorInfo | undefined> } | undefined;
  return metadata?.reactionUserInfoById?.[userId];
}

type NoteInlineCommentUiProps = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  registry: NotePluginRegistry;
  inlineCommentWritable: boolean;
  inlineCommentUserId: string;
  inlineCommentUsername: string;
  inlineCommentAvatarUrl: string;
  inlineCommentUsersById?: NoteInlineCommentUserDisplayRecord;
  isInlineCommentVisibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorInlineCommentVisibility;
  inlineCommentSidebarPortalContainer: HTMLElement | null;
  inlineCommentHistoryOpen: boolean;
  onInlineCommentHistoryOpenChange: (open: boolean) => void;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  inlineCommentThreadPositions: Map<string, NoteInlineCommentPosition>;
  onBumpInlineCommentSidebar: () => void;
};

export function NoteInlineCommentUi({
  editor,
  doc,
  registry,
  inlineCommentWritable,
  inlineCommentUserId,
  inlineCommentUsername,
  inlineCommentAvatarUrl,
  inlineCommentUsersById,
  isInlineCommentVisibilityPrivileged,
  collaboratorVisibility,
  inlineCommentSidebarPortalContainer,
  inlineCommentHistoryOpen,
  onInlineCommentHistoryOpenChange,
  localThreadReferenceTexts,
  inlineCommentThreadPositions,
  onBumpInlineCommentSidebar,
}: NoteInlineCommentUiProps) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const contentAnchorStores = getContentInlineCommentAnchorStores(doc, registry);
  const inlineCommentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const detachListenersRef = useRef<(() => void) | null>(null);

  const visibilityScope: InlineCommentVisibilityScope = {
    currentUserId: inlineCommentUserId,
    isPrivileged: isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
  };
  const canReopenThread = (thread: Parameters<typeof getThreadInlineComments>[0]) =>
    isInlineCommentVisibilityPrivileged ||
    getThreadInlineComments(thread)[0]?.userId === inlineCommentUserId;
  const resolveInlineCommentUser = useMemoizedFn(
    (
      rawUserId: string,
      inlineComment: CommentData,
      source: 'author' | 'reaction'
    ): WisePenInlineCommentAuthorInfo => {
      const inputUserId = trimDisplayValue(rawUserId);
      const userInfo =
        source === 'reaction'
          ? readReactionUserInfo(inlineComment, inputUserId)
          : readInlineCommentAuthorInfo(inlineComment);
      const userId = inputUserId || trimDisplayValue(userInfo?.id);
      const metadataName = pickSafeDisplayName(
        [userInfo?.name, userInfo?.nickname, userInfo?.realName, userInfo?.username],
        userId
      );
      const metadataAvatarUrl = normalizeAvatarUrl(userInfo?.avatarUrl || userInfo?.avatar);
      const isCurrentUser =
        userId === inlineCommentUserId ||
        (userId ? isPlaceholderInlineCommentUserId(userId) : false);

      if (isCurrentUser) {
        return {
          id: inlineCommentUserId,
          name:
            pickSafeDisplayName([inlineCommentUsername], inlineCommentUserId) ||
            CURRENT_INLINE_COMMENT_USER_NAME,
          avatarUrl: inlineCommentAvatarUrl || metadataAvatarUrl,
        };
      }

      const syncedUser = userId ? inlineCommentUsersYMap.get(userId) : undefined;
      if (syncedUser) {
        return {
          id: userId,
          name:
            pickSafeDisplayName([syncedUser.username], userId) ||
            metadataName ||
            UNKNOWN_INLINE_COMMENT_USER_NAME,
          avatarUrl: syncedUser.avatarUrl || metadataAvatarUrl,
        };
      }

      const knownUser = userId ? inlineCommentUsersById?.[userId] : undefined;
      if (knownUser) {
        return {
          id: userId,
          name:
            pickSafeDisplayName([knownUser.name], userId) ||
            metadataName ||
            UNKNOWN_INLINE_COMMENT_USER_NAME,
          avatarUrl: normalizeAvatarUrl(knownUser.avatar) || metadataAvatarUrl,
        };
      }

      return {
        id: userId,
        name: metadataName || UNKNOWN_INLINE_COMMENT_USER_NAME,
        avatarUrl: metadataAvatarUrl,
      };
    }
  );

  useMount(() => {
    const handleTransaction = (transaction: Y.Transaction) => {
      if (isContentInlineCommentYjsTransaction(transaction.origin)) {
        return;
      }
      const changed = transaction.changed as unknown as Map<unknown, unknown>;
      const threadsChanged = changed.has(threadsYMap);
      const anchorsChanged = contentAnchorStores.some((store) => changed.has(store));
      if (!threadsChanged && !anchorsChanged) {
        return;
      }
      if (isContentInlineCommentSyncing(doc)) {
        return;
      }
      onBumpInlineCommentSidebar();
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

  const inlineCommentHistorySidebar = (
    <InlineCommentThreadsSidebar
      editor={editor}
      doc={doc}
      localThreadReferenceTexts={localThreadReferenceTexts}
      inlineCommentThreadPositions={inlineCommentThreadPositions}
      visibilityScope={visibilityScope}
      filter="resolved"
      sort="recent-activity"
      maxInlineCommentsBeforeCollapse={5}
      actionMode="history"
      canReopenThread={canReopenThread}
      actionsEnabled={false}
      resolveInlineCommentUser={resolveInlineCommentUser}
    />
  );
  const inlineCommentSidebar = (
    <InlineCommentThreadsSidebar
      editor={editor}
      doc={doc}
      localThreadReferenceTexts={localThreadReferenceTexts}
      inlineCommentThreadPositions={inlineCommentThreadPositions}
      visibilityScope={visibilityScope}
      filter="open"
      sort="position"
      maxInlineCommentsBeforeCollapse={5}
      actionsEnabled={inlineCommentWritable}
      resolveInlineCommentUser={resolveInlineCommentUser}
    />
  );
  const renderedInlineCommentPanel = inlineCommentSidebarPortalContainer
    ? createPortal(inlineCommentSidebar, inlineCommentSidebarPortalContainer)
    : null;

  return (
    <>
      {inlineCommentWritable ? (
        <FloatingComposerController
          floatingUIOptions={{
            elementProps: {
              className: inlineCommentStyles.floatingInlineCommentComposer,
            },
          }}
        />
      ) : null}
      {renderedInlineCommentPanel}
      <InlineCommentHistoryModal
        isOpen={inlineCommentHistoryOpen}
        onOpenChange={onInlineCommentHistoryOpenChange}
      >
        <div className={inlineCommentStyles.historyThreadsSurface}>
          {inlineCommentHistorySidebar}
        </div>
      </InlineCommentHistoryModal>
    </>
  );
}

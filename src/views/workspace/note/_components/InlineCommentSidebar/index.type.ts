export type WisePenInlineCommentAuthorInfo = {
  id?: string;
  name: string;
  avatarUrl?: string;
};

export type WisePenInlineCommentData = {
  id: string;
  author: WisePenInlineCommentAuthorInfo;
  createdAt: Date;
  updatedAt: Date;
  content: string;
  reactions: WisePenInlineCommentReaction[];
  deleted?: boolean;
  canUpdate?: boolean;
};

type WisePenInlineCommentReaction = {
  id: string;
  emojiId: string;
  user: WisePenInlineCommentAuthorInfo;
  reactedByCurrentUser: boolean;
};

export type WisePenInlineCommentThread = {
  id: string;
  referenceText: string;
  resolved: boolean;
  inlineComments: WisePenInlineCommentData[];
};

export type WisePenInlineCommentSidebarActionMode = 'default' | 'history';

export type WisePenInlineCommentSidebarProps = {
  threads: WisePenInlineCommentThread[];
  className?: string;
  selectedThreadId?: string;
  maxInlineCommentsBeforeCollapse?: number;
  actionMode?: WisePenInlineCommentSidebarActionMode;
  actionsEnabled?: boolean;
  emptyText?: string;
  canReopenThread?: (thread: WisePenInlineCommentThread) => boolean;
  onSelectThread?: (threadId: string) => void;
  onUpdateInlineComment?: (
    threadId: string,
    inlineCommentId: string,
    content: string
  ) => void | Promise<void>;
  onDeleteInlineComment?: (threadId: string, inlineCommentId: string) => void | Promise<void>;
  onChangeInlineCommentReaction?: (
    threadId: string,
    inlineCommentId: string,
    emojiId: string,
    nextReacted: boolean
  ) => void | Promise<void>;
  onResolveThread?: (threadId: string) => void | Promise<void>;
  onReopenThread?: (threadId: string) => void | Promise<void>;
  onReplyThread?: (threadId: string, content: string) => void | Promise<void>;
};

import type {
  CommentItemActionRequest,
  CommentPage,
  CreateResourceCommentRequest,
  CreateResourceReplyRequest,
  ListResourceCommentsRequest,
  ListResourceRepliesRequest,
  ResourceComment,
} from '@/domains/Resource';

interface MockComment extends ResourceComment {
  rootCommentId?: string;
}

const CURRENT_USER_ID = '1';
const commentsByResource = new Map<string, MockComment[]>();
const likedIdsByResource = new Map<string, Set<string>>();

const author = (name: string) => ({ name });
const buildMockId = (resourceId: string, suffix: string) => `mock-${resourceId}-${suffix}`;

const createInitialComments = (resourceId: string): MockComment[] => {
  const now = Date.now();
  const firstRootId = buildMockId(resourceId, 'comment-1');
  const secondRootId = buildMockId(resourceId, 'comment-2');
  const thirdRootId = buildMockId(resourceId, 'comment-3');
  const featured: MockComment[] = [
    {
      commentId: firstRootId,
      resourceId,
      authorId: '10086',
      author: author('王明'),
      content: '这份 PDF 的结构很清晰，第二章的示例尤其有帮助。',
      imageUrls: [],
      likeCount: 8,
      replyCount: 2,
      commentType: 'COMMENT',
      createTime: now - 36 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: buildMockId(resourceId, 'reply-1'),
      resourceId,
      rootCommentId: firstRootId,
      authorId: CURRENT_USER_ID,
      author: author('张三'),
      replyToUserId: '10086',
      replyToUser: author('王明'),
      content: '我也觉得，图表把流程说明得很直观。',
      imageUrls: [],
      likeCount: 2,
      replyCount: 0,
      commentType: 'REPLY_TO_COMMENT',
      createTime: now - 25 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: buildMockId(resourceId, 'reply-2'),
      resourceId,
      rootCommentId: firstRootId,
      authorId: '10087',
      author: author('李若瑾'),
      replyToUserId: CURRENT_USER_ID,
      replyToUser: author('张三'),
      content: '后面还有一个完整案例，可以接着看。',
      imageUrls: [],
      likeCount: 4,
      replyCount: 0,
      commentType: 'REPLY_TO_REPLY',
      createTime: now - 12 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: secondRootId,
      resourceId,
      authorId: CURRENT_USER_ID,
      author: author('张三'),
      content: 'Mock 模式支持发布、回复、点赞、删除和分页，可以直接体验交互。',
      imageUrls: [],
      likeCount: 12,
      replyCount: 0,
      commentType: 'COMMENT',
      createTime: now - 2 * 60 * 60 * 1000,
      deleted: false,
    },
    {
      commentId: thirdRootId,
      resourceId,
      authorId: '10088',
      author: author('陈思齐'),
      content: '欢迎在这里交流对文档内容的理解。',
      imageUrls: [],
      likeCount: 3,
      replyCount: 0,
      commentType: 'COMMENT',
      createTime: now - 26 * 60 * 60 * 1000,
      deleted: false,
    },
  ];
  const additional = Array.from({ length: 14 }, (_, index): MockComment => ({
    commentId: buildMockId(resourceId, `scroll-comment-${index + 1}`),
    resourceId,
    authorId: index % 2 === 0 ? '10086' : '10087',
    author: author(index % 2 === 0 ? '王明' : '李若瑾'),
    content: `用于验证滑动动态加载的第 ${index + 1} 条评论。`,
    imageUrls: [],
    likeCount: 14 - index,
    replyCount: 0,
    commentType: 'COMMENT',
    createTime: now - (index + 3) * 3 * 60 * 60 * 1000,
    deleted: false,
  }));
  const additionalReplies = Array.from({ length: 12 }, (_, index): MockComment => ({
    commentId: buildMockId(resourceId, `scroll-reply-${index + 1}`),
    resourceId,
    rootCommentId: firstRootId,
    authorId: index % 2 === 0 ? '10088' : '10087',
    author: author(index % 2 === 0 ? '陈思齐' : '李若瑾'),
    replyToUserId: '10086',
    replyToUser: author('王明'),
    content: `用于验证回复区滑动加载的第 ${index + 1} 条回复。`,
    imageUrls: [],
    likeCount: index % 4,
    replyCount: 0,
    commentType: 'REPLY_TO_COMMENT',
    createTime: now - (index + 3) * 4 * 60 * 1000,
    deleted: false,
  }));
  const root = featured.find((item) => item.commentId === firstRootId);
  if (root) root.replyCount += additionalReplies.length;
  const tierReplies = [
    ...Array.from({ length: 5 }, (_, index): MockComment => ({
      commentId: buildMockId(resourceId, `inline-reply-${index + 1}`),
      resourceId,
      rootCommentId: secondRootId,
      authorId: '10086',
      author: author('王明'),
      replyToUserId: CURRENT_USER_ID,
      replyToUser: author('张三'),
      content: `3–7 条回复时原地展开：第 ${index + 1} 条。`,
      imageUrls: [],
      likeCount: index,
      replyCount: 0,
      commentType: 'REPLY_TO_COMMENT',
      createTime: now - (index + 1) * 5 * 60 * 1000,
      deleted: false,
    })),
    ...Array.from({ length: 2 }, (_, index): MockComment => ({
      commentId: buildMockId(resourceId, `direct-reply-${index + 1}`),
      resourceId,
      rootCommentId: thirdRootId,
      authorId: '10087',
      author: author('李若瑾'),
      replyToUserId: '10088',
      replyToUser: author('陈思齐'),
      content: `不超过 2 条时直接展示：第 ${index + 1} 条。`,
      imageUrls: [],
      likeCount: 0,
      replyCount: 0,
      commentType: 'REPLY_TO_COMMENT',
      createTime: now - (index + 1) * 7 * 60 * 1000,
      deleted: false,
    })),
  ];
  const middleRoot = featured.find((item) => item.commentId === secondRootId);
  const directRoot = featured.find((item) => item.commentId === thirdRootId);
  if (middleRoot) middleRoot.replyCount = 5;
  if (directRoot) directRoot.replyCount = 2;
  return [...featured, ...additional, ...additionalReplies, ...tierReplies];
};

const getComments = (resourceId: string): MockComment[] => {
  const existing = commentsByResource.get(resourceId);
  if (existing) return existing;
  const initial = createInitialComments(resourceId);
  commentsByResource.set(resourceId, initial);
  likedIdsByResource.set(
    resourceId,
    new Set([buildMockId(resourceId, 'comment-2'), buildMockId(resourceId, 'reply-2')])
  );
  return initial;
};

const toPage = (items: ResourceComment[], page: number, size: number): CommentPage => ({
  items: items.slice((page - 1) * size, page * size),
  total: items.length,
  page,
  size,
  totalPage: Math.ceil(items.length / size),
});

export const listMockComments = async (
  params: ListResourceCommentsRequest
): Promise<CommentPage> => {
  const comments = getComments(params.resourceId).filter((item) => item.commentType === 'COMMENT');
  comments.sort((a, b) =>
    params.sortBy === 'LIKE_COUNT' ? b.likeCount - a.likeCount : b.createTime - a.createTime
  );
  return toPage(comments, params.page, params.size);
};

export const listMockReplies = async (params: ListResourceRepliesRequest): Promise<CommentPage> => {
  const all = [...commentsByResource.values()].flat();
  const replies = all
    .filter((item) => item.rootCommentId === params.rootCommentId)
    .sort((a, b) => b.createTime - a.createTime);
  return toPage(replies, params.page, params.size);
};

export const createMockComment = async (params: CreateResourceCommentRequest): Promise<string> => {
  const commentId = `mock-comment-${crypto.randomUUID()}`;
  getComments(params.resourceId).unshift({
    commentId,
    resourceId: params.resourceId,
    authorId: CURRENT_USER_ID,
    author: author('张三'),
    content: params.content,
    imageUrls: params.imageUrls ?? [],
    likeCount: 0,
    replyCount: 0,
    commentType: 'COMMENT',
    createTime: Date.now(),
    deleted: false,
  });
  return commentId;
};

export const createMockReply = async (params: CreateResourceReplyRequest): Promise<string> => {
  const comments = getComments(params.resourceId);
  const target = comments.find((item) => item.commentId === params.replyTo && !item.deleted);
  if (!target) throw new Error('要回复的评论不存在');
  const rootCommentId = target.commentType === 'COMMENT' ? target.commentId : target.rootCommentId;
  const root = comments.find((item) => item.commentId === rootCommentId);
  if (root) root.replyCount += 1;
  const commentId = `mock-reply-${crypto.randomUUID()}`;
  comments.push({
    commentId,
    resourceId: params.resourceId,
    rootCommentId,
    authorId: CURRENT_USER_ID,
    author: author('张三'),
    replyToUserId: target.authorId,
    replyToUser: target.author,
    content: params.content,
    imageUrls: params.imageUrls ?? [],
    likeCount: 0,
    replyCount: 0,
    commentType: target.commentType === 'COMMENT' ? 'REPLY_TO_COMMENT' : 'REPLY_TO_REPLY',
    createTime: Date.now(),
    deleted: false,
  });
  return commentId;
};

export const deleteMockComment = async (params: CommentItemActionRequest): Promise<void> => {
  const comments = getComments(params.resourceId);
  const item = comments.find((comment) => comment.commentId === params.commentId);
  if (!item || item.deleted) throw new Error('评论不存在');
  item.deleted = true;
  item.content = '';
  item.imageUrls = [];
  if (item.commentType !== 'COMMENT' && item.rootCommentId) {
    const root = comments.find((comment) => comment.commentId === item.rootCommentId);
    if (root) root.replyCount = Math.max(0, root.replyCount - 1);
  }
};

export const toggleMockCommentLike = async (params: CommentItemActionRequest): Promise<boolean> => {
  const item = getComments(params.resourceId).find(
    (comment) => comment.commentId === params.commentId
  );
  if (!item || item.deleted) throw new Error('评论不存在');
  const likedIds = likedIdsByResource.get(params.resourceId) ?? new Set<string>();
  likedIdsByResource.set(params.resourceId, likedIds);
  const nextLiked = !likedIds.has(params.commentId);
  if (nextLiked) likedIds.add(params.commentId);
  else likedIds.delete(params.commentId);
  item.likeCount = Math.max(0, item.likeCount + (nextLiked ? 1 : -1));
  return nextLiked;
};

export const getMockCommentLikeIds = async (resourceId: string): Promise<ReadonlySet<string>> => {
  getComments(resourceId);
  return new Set(likedIdsByResource.get(resourceId));
};

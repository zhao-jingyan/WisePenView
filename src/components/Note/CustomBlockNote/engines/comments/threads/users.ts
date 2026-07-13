type CommentUserProfile = {
  username: string;
  avatarUrl: string;
};

type CommentUserDisplay = {
  name: string;
  avatar?: string;
};

export function normalizeAvatarUrl(avatar?: string): string {
  return avatar?.trim() || '';
}

const PLACEHOLDER_COMMENT_USER_ID = 'local' as const;

export function isPlaceholderCommentUserId(userId: string): boolean {
  return userId.trim() === PLACEHOLDER_COMMENT_USER_ID;
}

export function resolveActiveCommentUserProfile(
  commentUser: { id: string; nickname?: string; username: string; avatar?: string } | null,
  commentUserId?: string
) {
  const activeCommentUserId =
    commentUserId?.trim() ||
    commentUser?.id?.trim() ||
    commentUser?.username?.trim() ||
    PLACEHOLDER_COMMENT_USER_ID;
  const activeCommentUsername =
    commentUser?.nickname || commentUser?.username || activeCommentUserId;
  const activeCommentAvatarUrl = normalizeAvatarUrl(commentUser?.avatar);

  return { activeCommentUserId, activeCommentUsername, activeCommentAvatarUrl };
}

export function syncCommentUserProfileToYMap(
  commentUsersYMap: {
    set: (key: string, value: CommentUserProfile) => void;
    has: (key: string) => boolean;
    delete: (key: string) => void;
  },
  userId: string,
  profile: CommentUserProfile
): void {
  if (isPlaceholderCommentUserId(userId)) {
    return;
  }
  commentUsersYMap.set(userId, profile);
  if (commentUsersYMap.has(PLACEHOLDER_COMMENT_USER_ID)) {
    commentUsersYMap.delete(PLACEHOLDER_COMMENT_USER_ID);
  }
}

export function resolveBlockNoteCommentUsers(
  userIds: string[],
  options: {
    activeCommentUserId: string;
    activeCommentUsername: string;
    activeCommentAvatarUrl: string;
    commentUsersById?: Record<string, CommentUserDisplay>;
    commentUsersYMap: {
      get: (key: string) => CommentUserProfile | undefined;
    };
  }
) {
  const {
    activeCommentUserId,
    activeCommentUsername,
    activeCommentAvatarUrl,
    commentUsersById,
    commentUsersYMap,
  } = options;

  return userIds.map((id) => {
    const isActiveUser =
      id === activeCommentUserId ||
      (isPlaceholderCommentUserId(id) && !isPlaceholderCommentUserId(activeCommentUserId));

    if (isActiveUser) {
      return {
        id: activeCommentUserId,
        username: activeCommentUsername,
        avatarUrl: activeCommentAvatarUrl,
      };
    }

    const syncedUser = commentUsersYMap.get(id);
    if (syncedUser) {
      return {
        id,
        username: syncedUser.username || id,
        avatarUrl: syncedUser.avatarUrl || '',
      };
    }

    const knownUser = commentUsersById?.[id];
    if (knownUser) {
      return {
        id,
        username: knownUser.name,
        avatarUrl: normalizeAvatarUrl(knownUser.avatar),
      };
    }

    return {
      id,
      username: isPlaceholderCommentUserId(id) ? '未知用户' : id,
      avatarUrl: '',
    };
  });
}

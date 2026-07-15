type InlineCommentUserProfile = {
  username: string;
  avatarUrl: string;
};

type InlineCommentUserDisplay = {
  name: string;
  avatar?: string;
};

export function normalizeAvatarUrl(avatar?: string): string {
  return avatar?.trim() || '';
}

const PLACEHOLDER_INLINE_COMMENT_USER_ID = 'local' as const;

export function isPlaceholderInlineCommentUserId(userId: string): boolean {
  return userId.trim() === PLACEHOLDER_INLINE_COMMENT_USER_ID;
}

export function resolveActiveInlineCommentUserProfile(
  inlineCommentActor: { id: string; nickname?: string; username: string; avatar?: string } | null,
  inlineCommentUserId?: string
) {
  const activeInlineCommentUserId =
    inlineCommentUserId?.trim() ||
    inlineCommentActor?.id?.trim() ||
    inlineCommentActor?.username?.trim() ||
    PLACEHOLDER_INLINE_COMMENT_USER_ID;
  const activeInlineCommentUsername =
    inlineCommentActor?.nickname || inlineCommentActor?.username || activeInlineCommentUserId;
  const activeInlineCommentAvatarUrl = normalizeAvatarUrl(inlineCommentActor?.avatar);

  return { activeInlineCommentUserId, activeInlineCommentUsername, activeInlineCommentAvatarUrl };
}

export function syncInlineCommentUserProfileToYMap(
  inlineCommentUsersYMap: {
    set: (key: string, value: InlineCommentUserProfile) => void;
    has: (key: string) => boolean;
    delete: (key: string) => void;
  },
  userId: string,
  profile: InlineCommentUserProfile
): void {
  if (isPlaceholderInlineCommentUserId(userId)) {
    return;
  }
  inlineCommentUsersYMap.set(userId, profile);
  if (inlineCommentUsersYMap.has(PLACEHOLDER_INLINE_COMMENT_USER_ID)) {
    inlineCommentUsersYMap.delete(PLACEHOLDER_INLINE_COMMENT_USER_ID);
  }
}

export function resolveBlockNoteInlineCommentUsers(
  userIds: string[],
  options: {
    activeInlineCommentUserId: string;
    activeInlineCommentUsername: string;
    activeInlineCommentAvatarUrl: string;
    inlineCommentUsersById?: Record<string, InlineCommentUserDisplay>;
    inlineCommentUsersYMap: {
      get: (key: string) => InlineCommentUserProfile | undefined;
    };
  }
) {
  const {
    activeInlineCommentUserId,
    activeInlineCommentUsername,
    activeInlineCommentAvatarUrl,
    inlineCommentUsersById,
    inlineCommentUsersYMap,
  } = options;

  return userIds.map((id) => {
    const isActiveUser =
      id === activeInlineCommentUserId ||
      (isPlaceholderInlineCommentUserId(id) &&
        !isPlaceholderInlineCommentUserId(activeInlineCommentUserId));

    if (isActiveUser) {
      return {
        id: activeInlineCommentUserId,
        username: activeInlineCommentUsername,
        avatarUrl: activeInlineCommentAvatarUrl,
      };
    }

    const syncedUser = inlineCommentUsersYMap.get(id);
    if (syncedUser) {
      return {
        id,
        username: syncedUser.username || id,
        avatarUrl: syncedUser.avatarUrl || '',
      };
    }

    const knownUser = inlineCommentUsersById?.[id];
    if (knownUser) {
      return {
        id,
        username: knownUser.name,
        avatarUrl: normalizeAvatarUrl(knownUser.avatar),
      };
    }

    return {
      id,
      username: isPlaceholderInlineCommentUserId(id) ? '未知用户' : id,
      avatarUrl: '',
    };
  });
}

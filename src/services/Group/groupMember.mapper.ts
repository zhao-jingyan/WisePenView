import { mapRoleCodeToGroupMemberRole } from '@/constants/group';
import type { GroupMember } from '@/types/group';
import type { GroupMemberRawResponse } from './index.type';

/** OpenAPI GroupMemberDetailResponse → 领域 GroupMember（userId ← memberId） */
export const mapGroupMemberRawResponse = (raw: GroupMemberRawResponse): GroupMember => ({
  userId: raw.memberId,
  realname: raw.memberInfo.realName ?? '',
  nickname: raw.memberInfo.nickname,
  role: mapRoleCodeToGroupMemberRole(raw.role),
  joinTime: raw.joinTime,
  avatar: raw.memberInfo.avatar ?? '',
  limit: raw.tokenLimit,
  used: raw.tokenUsed,
});

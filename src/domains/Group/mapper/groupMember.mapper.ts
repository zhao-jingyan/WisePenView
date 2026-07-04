import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import type { GroupMemberRawResponse } from '../service/index.type';

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberRawResponse = (raw: GroupMemberRawResponse): GroupMember => ({
  userId: raw.memberId,
  realname: raw.memberInfo.realName ?? '',
  nickname: raw.memberInfo.nickname,
  role: ROLE.getKey(raw.role) ?? 'MEMBER',
  joinTime: raw.joinTime,
  avatar: raw.memberInfo.avatar ?? '',
  // fallback：旧成员接口可能缺少配额字段，领域层统一补齐为 0。
  limit: raw.tokenLimit ?? 0,
  // fallback：旧成员接口可能缺少用量字段，领域层统一补齐为 0。
  used: raw.tokenUsed ?? 0,
});

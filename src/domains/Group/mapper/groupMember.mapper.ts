import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import type { GroupMemberRawResponse } from '../service/index.type';

const EMPTY_TEXT = '-';

const mapMemberDisplayName = (realname: string, nickname: string): string => {
  return nickname.trim() || realname.trim() || '?';
};

/** OpenAPI GroupMemberDetailResponse -> 领域 GroupMember（userId <- memberId） */
export const mapGroupMemberRawResponse = (raw: GroupMemberRawResponse): GroupMember => {
  const realname = raw.memberInfo.realName ?? '';
  const nickname = raw.memberInfo.nickname;
  const displayName = mapMemberDisplayName(realname, nickname);
  const realNameSubline =
    realname.trim() && realname.trim() !== displayName ? realname.trim() : undefined;
  const role = ROLE.getKey(raw.role) ?? 'MEMBER';
  const joinTimeText = formatTimestampToDate(raw.joinTime) || EMPTY_TEXT;
  const avatar = raw.memberInfo.avatar ?? '';

  return {
    userId: raw.memberId,
    realname,
    nickname,
    displayName,
    realNameSubline,
    role,
    roleLabel: ROLE.keyLabels[role] || role,
    joinTime: raw.joinTime,
    joinTimeText,
    avatar,
    avatarSrc: avatar.trim() || undefined,
    // fallback：旧成员接口可能缺少配额字段，领域层统一补齐为 0。
    limit: raw.tokenLimit ?? 0,
    // fallback：旧成员接口可能缺少用量字段，领域层统一补齐为 0。
    used: raw.tokenUsed ?? 0,
  };
};

export const mapGroupMemberEntityDisplay = (member: GroupMember): GroupMember => {
  const displayName = mapMemberDisplayName(member.realname, member.nickname);
  const realNameSubline =
    member.realname.trim() && member.realname.trim() !== displayName
      ? member.realname.trim()
      : undefined;
  return {
    ...member,
    displayName,
    realNameSubline,
    roleLabel: ROLE.keyLabels[member.role] || member.role,
    joinTimeText: formatTimestampToDate(member.joinTime) || EMPTY_TEXT,
    avatarSrc: member.avatar.trim() || undefined,
  };
};

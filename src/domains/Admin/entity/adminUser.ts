import type { UserVerificationMode } from '@/domains/User/enum';

export interface AdminUser {
  id: string;
  username: string;
  usernameText: string;
  nickname?: string;
  nicknameText: string;
  realName?: string;
  avatar?: string;
  avatarSrc?: string;
  displayName: string;
  identityType: number;
  identityTypeLabel: string;
  campusNo?: string;
  campusNoText: string;
  email?: string;
  emailText: string;
  mobile?: string;
  verificationMode?: UserVerificationMode | null;
  status: number;
  statusLabel: string;
  createTime?: string;
  createTimeText: string;
  updateTime?: string;
}

import type { UserAccountProfile } from '../entity/user';
import { getVerificationModeLabel, IDENTITY } from '../enum';

export const USER_ACCOUNT_EMPTY_TEXT = '-';

export interface UserAccountDisplayItem {
  key: string;
  label: string;
  value: string;
}

const getProfileText = (value: string | null | undefined): string => {
  const text = value?.trim();
  return text ? text : USER_ACCOUNT_EMPTY_TEXT;
};

export const getAccountIdentityType = (user: UserAccountProfile | null): number => {
  // 页面初始加载阶段按学生身份展示默认字段，接口返回后会按真实身份重算。
  return user?.userInfo.identityType ?? IDENTITY.STUDENT;
};

export const buildAccountDisplayItems = (
  user: UserAccountProfile | null
): UserAccountDisplayItem[] => [
  { key: 'username', label: '用户名', value: getProfileText(user?.userInfo.username) },
  {
    key: 'campusNo',
    label: '学工号',
    value:
      user?.userInfo.campusNo === 'PENDING'
        ? USER_ACCOUNT_EMPTY_TEXT
        : getProfileText(user?.userInfo.campusNo),
  },
  { key: 'email', label: '邮箱', value: getProfileText(user?.userInfo.email) },
  { key: 'mobile', label: '手机号', value: getProfileText(user?.userInfo.mobile) },
];

export const getAccountNicknameText = (user: UserAccountProfile | null): string =>
  getProfileText(user?.userInfo.nickname ?? user?.userInfo.username ?? '未设置昵称');

export const getAccountAvatarFallbackText = (user: UserAccountProfile | null): string => {
  const baseText = user?.userInfo.nickname?.trim() || user?.userInfo.username?.trim() || '?';
  return baseText.charAt(0).toUpperCase();
};

export const getAccountIdentityLabel = (user: UserAccountProfile | null): string =>
  user ? IDENTITY.getLabel(user.userInfo.identityType) : '';

export const getAccountVerifiedText = (user: UserAccountProfile | null): string =>
  getVerificationModeLabel(user?.userInfo.verificationMode ?? null);

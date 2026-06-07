import type { DegreeLevel, UserVerificationMode } from '../enum';

// 只存储需要的用户字段；id 用 string 避免大数精度丢失
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  identityType: number;
  realName?: string;
  campusNo?: string;
}

/** 后端 UserDisplayBase：用于作者/创建者等轻量展示 */
export interface UserDisplayBase {
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType?: number;
}

export interface UserAccountInfo {
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType: number;
  username: string;
  campusNo?: string;
  email?: string;
  mobile?: string;
  verificationMode: UserVerificationMode | null;
  status: number;
}

export interface UserProfileInfo {
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}

/** 账号页使用的稳定前端实体，已脱离后端 getUserInfo 原始响应结构。 */
export interface UserAccountProfile {
  id: string;
  userInfo: UserAccountInfo;
  userProfile: UserProfileInfo;
  readonlyFields: string[];
}

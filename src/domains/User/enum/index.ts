import { createEnum } from '@/utils/enum';

/** 邮箱后缀类型（发起邮箱验证用）：0 -> @m.fudan.edu.cn；1 -> @fudan.edu.cn */
export const EMAIL_SUFFIX = createEnum([
  { value: 0, key: 'M_FUDAN', label: '@m.fudan.edu.cn' },
  { value: 1, key: 'FUDAN', label: '@fudan.edu.cn' },
] as const);
export const EMAIL_SUFFIX_TYPE = EMAIL_SUFFIX.values;
export const EMAIL_SUFFIX_LABELS: Record<number, string> = EMAIL_SUFFIX.labels;

/** 身份类型 */
export const IDENTITY = createEnum([
  { value: 1, key: 'STUDENT', label: '学生' },
  { value: 2, key: 'TEACHER', label: '教师' },
  { value: 3, key: 'ADMIN', label: '管理员' },
] as const);
export const IDENTITY_TYPE = IDENTITY.values;
export const IDENTITY_TYPE_LABELS: Record<number, string> = IDENTITY.labels;
export const getIdentityTypeLabel = (v: number) => IDENTITY_TYPE_LABELS[v] ?? String(v);

/** 性别 */
export const SEX_ENUM = createEnum([
  { value: 0, key: 'MALE', label: '男' },
  { value: 1, key: 'FEMALE', label: '女' },
  { value: 2, key: 'UNKNOWN', label: '未知' },
] as const);
export const SEX = SEX_ENUM.values;
export const SEX_LABELS: Record<number, string> = SEX_ENUM.labels;
export const getSexLabel = (v: number) => SEX_LABELS[v] ?? String(v);

/** 账号状态 */
export const USER_STATUS_ENUM = createEnum([
  { value: -1, key: 'UNVERIFIED', label: '未验证' },
  { value: -2, key: 'BANNED', label: '封禁' },
  { value: 1, key: 'NORMAL', label: '正常' },
] as const);
export const USER_STATUS = USER_STATUS_ENUM.values;
export const USER_STATUS_LABELS: Record<number, string> = USER_STATUS_ENUM.labels;
export const getStatusLabel = (v: number) => USER_STATUS_LABELS[v] ?? String(v);

/** 认证方式（与后端 UserVerificationMode 对齐） */
export const USER_VERIFICATION = createEnum([
  { value: 'EDU_EMAIL', key: 'EDU_EMAIL', label: '邮箱认证' },
  { value: 'FDU_UIS_SYS', key: 'FDU_UIS_SYS', label: 'UIS认证' },
] as const);
export const USER_VERIFICATION_MODE = USER_VERIFICATION.values;
export type UserVerificationMode = (typeof USER_VERIFICATION.options)[number]['value'];
export const USER_VERIFICATION_MODE_LABELS: Record<UserVerificationMode, string> =
  USER_VERIFICATION.labels;
export const getVerificationModeLabel = (mode: UserVerificationMode | null | undefined): string => {
  if (!mode) return '已认证';
  return USER_VERIFICATION_MODE_LABELS[mode] ?? '已认证';
};

/** 学历层次（学生用） */
export const DEGREE = createEnum([
  { value: 0, key: 'UNKNOWN', label: '未知' },
  { value: 1, key: 'UNDERGRADUATE', label: '本科' },
  { value: 2, key: 'MASTER', label: '硕士' },
  { value: 3, key: 'DOCTOR', label: '博士' },
] as const);

export const DEGREE_LEVEL = DEGREE.values;
export type DegreeLevel = (typeof DEGREE.options)[number]['value'];

export const DEGREE_LEVEL_LABELS: Record<number, string> = DEGREE.labels;

export const getDegreeLevelLabel = (v: number) => DEGREE_LEVEL_LABELS[v] ?? String(v);

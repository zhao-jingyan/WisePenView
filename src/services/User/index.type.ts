import type { User } from '@/types/user';

/** UserService 接口：供依赖注入使用 */
export interface IUserService {
  /** 全量拉取用户信息（为 Account 等页服务），不缓存 */
  getFullUserInfo(): Promise<GetUserInfoResponse>;
  /** 展示用精简用户信息，带缓存，供侧栏等展示 */
  getUserInfo(options?: { forceRefresh?: boolean }): Promise<User>;
  /** 更新用户信息（内部两次 PUT：userInfo + userProfile）；不拉 GET，需全量时由调用方自行 getFullUserInfo */
  updateUserInfo(params: UpdateUserInfoRequest): Promise<void>;
  sendEmailVerify(params: SendEmailVerifyRequest): Promise<void>;
  confirmEmailVerify(params: ConfirmEmailVerifyRequest): Promise<void>;
  /** 退出登录时清理缓存 */
  clearUserCache(): void;
}

/** 确认邮箱验证请求参数 */
export interface ConfirmEmailVerifyRequest {
  token: string;
}

/** 发起邮箱验证请求参数（后端接受完整邮箱字符串） */
export interface SendEmailVerifyRequest {
  email: string;
}

/** 更新用户信息请求参数（仅基本档案可编辑；账号栏只读；impl 内按 userInfo / userProfile 拆成两次 PUT） */
export interface UpdateUserInfoRequest {
  nickname?: string;
  realName?: string;
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: number;
  academicTitle?: string;
}

/** 获取用户信息接口响应 data 中的 userInfo；id 用 string 避免大数精度丢失 */
export interface GetUserInfoResponseUserInfo {
  id?: string;
  nickname: string | null;
  realName: string | null;
  avatar: string | null;
  identityType: number;
  username: string;
  campusNo: string;
  email: string | null;
  mobile: string | null;
  verificationMode: number | string | null;
  status: number;
}

/** 获取用户信息接口响应 data 中的 userProfile */
export interface GetUserInfoResponseUserProfile {
  sex: number;
  university: string | null;
  college: string | null;
  major: string | null;
  className: string | null;
  enrollmentYear: string | null;
  degreeLevel: number | null;
  academicTitle: string | null;
}

/** 获取用户信息接口的响应 data 类型 */
export interface GetUserInfoResponse {
  userInfo: GetUserInfoResponseUserInfo;
  userProfile: GetUserInfoResponseUserProfile;
  readonlyFields: string[] | null;
}

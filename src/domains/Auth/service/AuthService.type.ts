/** 登录请求参数 */
export interface LoginRequest {
  account: string;
  password: string;
}

/** 注册请求参数 */
export interface RegisterRequest {
  username: string;
  password: string;
}

/** 忘记密码-发送邮件请求参数 */
export interface ResetPasswordRequest {
  campusNum: string;
}

/** 忘记密码-重置新密码请求参数 */
export interface NewPasswordRequest {
  newPassword: string;
  token: string;
}

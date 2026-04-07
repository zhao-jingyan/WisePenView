/** AuthService 接口：供依赖注入使用 */
export interface IAuthService {
  login(params: LoginRequest): Promise<void>;
  register(params: RegisterRequest): Promise<void>;
  resetPassword(params: ResetPasswordRequest): Promise<void>;
  newPassword(params: NewPasswordRequest): Promise<void>;
  logout(): Promise<void>;
}

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

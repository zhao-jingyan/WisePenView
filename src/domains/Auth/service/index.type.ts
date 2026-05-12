import type {
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './AuthService.type';

/** AuthService 接口：供依赖注入使用 */
export interface IAuthService {
  login(params: LoginRequest): Promise<void>;
  register(params: RegisterRequest): Promise<void>;
  resetPassword(params: ResetPasswordRequest): Promise<void>;
  newPassword(params: NewPasswordRequest): Promise<void>;
  logout(): Promise<void>;
}

import { USERNAME_PATTERN } from '@/constants/user';
import { AuthApi } from '@/apis/auth';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
} from './index.type';
import type { IAuthService } from './index.type';
import { clearAllZustandStores } from '@/store';
import { clearAllServiceCaches } from '@/services/cacheRegistry';
import { emitAuthChangeEvent } from '@/utils/auth/authChange';

const login = async (params: LoginRequest) => {
  await AuthApi.login(params);
  clearAllServiceCaches();
  clearAllZustandStores();
  emitAuthChangeEvent();
};

const logout = async () => {
  await AuthApi.logout();
  clearAllServiceCaches();
  clearAllZustandStores();
  emitAuthChangeEvent();
};

const register = async (params: RegisterRequest) => {
  if (!USERNAME_PATTERN.test(params.username)) {
    throw new Error('用户名必须是4-20位字母、数字或下划线');
  }
  await AuthApi.register(params);
};

const resetPassword = async (params: ResetPasswordRequest) => {
  await AuthApi.forgotPasswordEmail(params);
};

const newPassword = async (params: NewPasswordRequest) => {
  await AuthApi.forgotPasswordReset(params);
};

export const createAuthServices = (): IAuthService => ({
  login,
  register,
  resetPassword,
  newPassword,
  logout,
});

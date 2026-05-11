import { USERNAME_PATTERN } from '@/constants/user';
import { AuthApi } from '../apis/AuthApi';
import { AuthServicesMap } from '../mapper/AuthServices.map';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
} from './AuthService.type';
import type { IAuthService } from './index.type';
import { clearAllZustandStores } from '@/store';
import { clearAllServiceCaches } from '@/domains/_shared/cacheRegistry';
import { emitAuthChangeEvent } from '@/utils/auth/authChange';

const login = async (params: LoginRequest) => {
  const apiParams = AuthServicesMap.toLoginApiRequest(params);
  await AuthApi.login(apiParams);
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
  const apiParams = AuthServicesMap.toRegisterApiRequest(params);
  await AuthApi.register(apiParams);
};

const resetPassword = async (params: ResetPasswordRequest) => {
  const apiParams = AuthServicesMap.toResetPasswordApiRequest(params);
  await AuthApi.forgotPasswordEmail(apiParams);
};

const newPassword = async (params: NewPasswordRequest) => {
  const apiParams = AuthServicesMap.toNewPasswordApiRequest(params);
  await AuthApi.forgotPasswordReset(apiParams);
};

export const createAuthServices = (): IAuthService => ({
  login,
  register,
  resetPassword,
  newPassword,
  logout,
});

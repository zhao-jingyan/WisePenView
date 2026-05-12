import { clearAllServiceCaches } from '@/domains/_shared/cacheRegistry';
import { clearAllZustandStores } from '@/store';
import { emitAuthChangeEvent } from '@/utils/auth/authChange';
import { AuthApi } from '../apis/AuthApi';
import { AuthServicesMap } from '../mapper/AuthServices.map';
import type {
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './AuthService.type';
import type { IAuthService } from './index.type';

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

import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { USERNAME_PATTERN } from '@/constants/user';
import type { ApiResponse } from '@/types/api';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
} from './index.type';
import type { IAuthService } from './index.type';
import { clearAllZustandStores } from '@/store';
import { clearAllServiceCaches } from '@/services/cacheRegistry';

const login = async (params: LoginRequest) => {
  const res = (await Axios.post('/auth/login', params)) as ApiResponse;
  checkResponse(res);
};

const logout = async () => {
  const res = (await Axios.post('/auth/logout')) as ApiResponse;
  checkResponse(res);
  clearAllServiceCaches();
  clearAllZustandStores();
};

const register = async (params: RegisterRequest) => {
  if (!USERNAME_PATTERN.test(params.username)) {
    throw new Error('用户名必须是4-20位字母、数字或下划线');
  }
  const res = (await Axios.post('/auth/register', params)) as ApiResponse;
  checkResponse(res);
};

const resetPassword = async (params: ResetPasswordRequest) => {
  const res = (await Axios.post('/auth/forgot-password/email', params)) as ApiResponse;
  checkResponse(res);
};

const newPassword = async (params: NewPasswordRequest) => {
  const res = (await Axios.post('/auth/forgot-password/reset', params)) as ApiResponse;
  checkResponse(res);
};

export const AuthServicesImpl: IAuthService = {
  login,
  register,
  resetPassword,
  newPassword,
  logout,
};

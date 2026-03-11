import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
} from './index.type';

const login = async (params: LoginRequest) => {
  const res = (await Axios.post('/auth/login', params)) as ApiResponse;
  checkResponse(res);
};

const register = async (params: RegisterRequest) => {
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

export const AuthServices = {
  login,
  register,
  resetPassword,
  newPassword,
};

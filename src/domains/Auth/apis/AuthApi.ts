import { apiPost } from '@/apis/request';
import type {
  LoginApiRequest,
  LoginApiResponse,
  LogoutApiResponse,
  NewPasswordApiRequest,
  NewPasswordApiResponse,
  RegisterApiRequest,
  RegisterApiResponse,
  ResetPasswordApiRequest,
  ResetPasswordApiResponse,
} from './AuthApi.type';

function login(req: LoginApiRequest): Promise<LoginApiResponse> {
  return apiPost('/auth/login', req);
}

function logout(): Promise<LogoutApiResponse> {
  return apiPost('/auth/logout');
}

function register(req: RegisterApiRequest): Promise<RegisterApiResponse> {
  return apiPost('/auth/register', req);
}

function forgotPasswordEmail(req: ResetPasswordApiRequest): Promise<ResetPasswordApiResponse> {
  return apiPost('/auth/forgot-password/email', req);
}

function forgotPasswordReset(req: NewPasswordApiRequest): Promise<NewPasswordApiResponse> {
  return apiPost('/auth/forgot-password/reset', req);
}

export const AuthApi = {
  login,
  logout,
  register,
  forgotPasswordEmail,
  forgotPasswordReset,
};

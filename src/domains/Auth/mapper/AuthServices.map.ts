import type {
  LoginApiRequest,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from '../apis/AuthApi.type';
import type {
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../service/AuthService.type';

const toLoginApiRequest = (params: LoginRequest): LoginApiRequest => ({
  account: params.account,
  password: params.password,
});

const toRegisterApiRequest = (params: RegisterRequest): RegisterApiRequest => ({
  username: params.username,
  password: params.password,
});

const toResetPasswordApiRequest = (params: ResetPasswordRequest): ResetPasswordApiRequest => ({
  campusNum: params.campusNum,
});

const toNewPasswordApiRequest = (params: NewPasswordRequest): NewPasswordApiRequest => ({
  newPassword: params.newPassword,
  token: params.token,
});

export const AuthServicesMap = {
  toLoginApiRequest,
  toRegisterApiRequest,
  toResetPasswordApiRequest,
  toNewPasswordApiRequest,
};

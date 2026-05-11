import type {
  LoginApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
  NewPasswordApiRequest,
} from '../apis/AuthApi.type';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
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

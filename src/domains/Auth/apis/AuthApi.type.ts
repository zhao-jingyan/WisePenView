import type {
  AuthLoginRequest,
  AuthPwdResetRequest,
  AuthPwdResetVerifyRequest,
  AuthRegisterRequest,
} from '@/_autoGen/api/user/types.gen';

export type LoginApiRequest = AuthLoginRequest;
export type RegisterApiRequest = AuthRegisterRequest;
export type ResetPasswordApiRequest = AuthPwdResetVerifyRequest;
export type NewPasswordApiRequest = AuthPwdResetRequest;

export type LoginApiResponse = string | undefined;
export type LogoutApiResponse = void;
export type RegisterApiResponse = string | undefined;
export type ResetPasswordApiResponse = void;
export type NewPasswordApiResponse = void;

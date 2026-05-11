export interface LoginApiRequest {
  account: string;
  password: string;
}

export interface RegisterApiRequest {
  username: string;
  password: string;
}

export interface ResetPasswordApiRequest {
  campusNum: string;
}

export interface NewPasswordApiRequest {
  newPassword: string;
  token: string;
}

export type LoginApiResponse = void;
export type LogoutApiResponse = void;
export type RegisterApiResponse = void;
export type ResetPasswordApiResponse = void;
export type NewPasswordApiResponse = void;

import type {
  IAuthService,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  NewPasswordRequest,
} from '@/services/Auth';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const login = async (_params: LoginRequest): Promise<void> => {
  await delay(300);
};

const register = async (_params: RegisterRequest): Promise<void> => {
  await delay(300);
};

const resetPassword = async (_params: ResetPasswordRequest): Promise<void> => {
  await delay(300);
};

const newPassword = async (_params: NewPasswordRequest): Promise<void> => {
  await delay(300);
};

const logout = async (): Promise<void> => {
  await delay(100);
};

export const AuthServicesMock: IAuthService = {
  login,
  register,
  resetPassword,
  newPassword,
  logout,
};

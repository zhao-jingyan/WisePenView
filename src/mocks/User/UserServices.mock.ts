import type { User } from '@/types/user';
import type { IUserService } from '@/services/User';
import type { GetUserInfoResponse } from '@/services/User';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fullUserInfo = mockdata as GetUserInfoResponse;

const getUserInfo = async (_options?: { forceRefresh?: boolean }): Promise<User> => {
  await delay(200);
  const { userInfo } = fullUserInfo;
  return {
    id: userInfo.id ?? '',
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  await delay(200);
  return fullUserInfo;
};

const sendEmailVerify = async (): Promise<void> => {
  await delay(200);
};

const confirmEmailVerify = async (): Promise<void> => {
  await delay(200);
};

const updateUserInfo = async (
  params: Parameters<IUserService['updateUserInfo']>[0]
): Promise<void> => {
  await delay(200);
  const { nickname, realName, ...profileParams } = params;
  Object.assign(fullUserInfo.userInfo, {
    ...(nickname !== undefined && { nickname }),
    ...(realName !== undefined && { realName }),
  });
  Object.assign(fullUserInfo.userProfile, profileParams);
};

const clearUserCache = (): void => {};

export const UserServicesMock: IUserService = {
  getFullUserInfo,
  getUserInfo,
  updateUserInfo,
  sendEmailVerify,
  confirmEmailVerify,
  clearUserCache,
};

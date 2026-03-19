import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toIdString } from '@/utils/number';
import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/user';
import type {
  ConfirmEmailVerifyRequest,
  GetUserInfoResponse,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from './index.type';
import type { IUserService } from './index.type';

/** 仅缓存展示用字段和 id，不含 realName、campusNo 等敏感信息；id 归一化为 string 避免大数精度丢失 */
type CachedUserSafe = Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'identityType'>;

const toUserSafe = (data: GetUserInfoResponse): CachedUserSafe => {
  const { userInfo } = data;
  return {
    id: toIdString(userInfo.id),
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

/** 模块级缓存，仅存非敏感展示字段，退出登录时通过 clearUserCache 清理 */
let cachedUserInfo: CachedUserSafe | null = null;

/** 全量拉取，为 Account 等页服务，不缓存 */
const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  const res = (await Axios.get('/user/getUserInfo')) as ApiResponse<GetUserInfoResponse>;
  checkResponse(res);
  return res.data;
};

/** 展示用精简信息，带缓存；无缓存或 forceRefresh 时走 getFullUserInfo 再落缓存 */
const getUserInfo = async (options?: { forceRefresh?: boolean }): Promise<User> => {
  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh && cachedUserInfo) {
    return cachedUserInfo;
  }
  const data = await getFullUserInfo();
  cachedUserInfo = toUserSafe(data);
  return cachedUserInfo;
};

/** 更新用户信息：仅两次 PUT，不与 GET 耦合；成功后使展示缓存失效，侧栏等下次 getUserInfo 会重新拉取 */
const updateUserInfo = async (params: UpdateUserInfoRequest): Promise<void> => {
  const userInfoPayload = {
    nickname: params.nickname,
    realName: params.realName,
  };
  const userProfilePayload = {
    sex: params.sex,
    university: params.university,
    college: params.college,
    major: params.major,
    className: params.className,
    enrollmentYear: params.enrollmentYear,
    degreeLevel: params.degreeLevel,
    academicTitle: params.academicTitle,
  };

  const [resInfo, resProfile] = await Promise.all([
    Axios.put('/user/changeUserInfo', userInfoPayload) as Promise<ApiResponse<unknown>>,
    Axios.put('/user/changeUserProfile', userProfilePayload) as Promise<ApiResponse<unknown>>,
  ]);
  checkResponse(resInfo);
  checkResponse(resProfile);

  cachedUserInfo = null;
};

const clearUserCache = (): void => {
  cachedUserInfo = null;
};

const sendEmailVerify = async (params: SendEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.post('/user/verify/initiateEmailVerify', {
    email: params.email,
  })) as ApiResponse;
  checkResponse(res);
};

const confirmEmailVerify = async (params: ConfirmEmailVerifyRequest): Promise<void> => {
  const res = (await Axios.get('/user/verify/check', {
    params: { token: params.token },
  })) as ApiResponse;
  checkResponse(res);
};

export const UserServicesImpl: IUserService = {
  getFullUserInfo,
  getUserInfo,
  updateUserInfo,
  sendEmailVerify,
  confirmEmailVerify,
  clearUserCache,
};

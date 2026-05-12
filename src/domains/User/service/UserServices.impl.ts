import type { User } from '@/domains/User';
import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { UserApi } from '../apis/UserApi';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  GetUserInfoResponse,
  InitiateUISVerifyRequest,
  IUserService,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from './index.type';

/** 仅缓存展示用字段和 id，不含 realName、campusNo 等敏感信息；id 归一化为 string 避免大数精度丢失 */
type CachedUserSafe = Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'identityType'>;

const toUserSafe = (data: GetUserInfoResponse): CachedUserSafe => {
  const { userInfo } = data;
  return {
    id: normalizeId(userInfo.id),
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

/** 全量拉取，为 Account 等页服务，不缓存 */
const getFullUserInfo = async (): Promise<GetUserInfoResponse> => {
  return UserApi.getUserInfo() as Promise<GetUserInfoResponse>;
};

const sendEmailVerify = async (params: SendEmailVerifyRequest): Promise<void> => {
  await UserApi.initiateEmailVerify({ email: params.email });
};

const initiateUISVerify = async (params: InitiateUISVerifyRequest): Promise<void> => {
  await UserApi.initiateFudanUISVerify({
    uisAccount: params.uisAccount,
    uisPassword: params.uisPassword,
  });
};

const normalizeFudanUISVerifyData = (raw: unknown): FudanUISVerifyStatusData => {
  if (!raw || typeof raw !== 'object') {
    return {
      completed: false,
      requireAction: false,
      actionPayload: '',
      message: '',
    };
  }
  const d = raw as Record<string, unknown>;
  return {
    completed: Boolean(d.completed),
    requireAction: Boolean(d.requireAction),
    actionPayload: typeof d.actionPayload === 'string' ? d.actionPayload : '',
    message: typeof d.message === 'string' ? d.message : '',
  };
};

const checkFudanUISVerify = async (): Promise<FudanUISVerifyStatusData> => {
  const data = await UserApi.checkFudanUISVerify();
  return normalizeFudanUISVerifyData(data);
};

const confirmEmailVerify = async (params: ConfirmEmailVerifyRequest): Promise<void> => {
  await UserApi.checkEmailVerify({ token: params.token });
};

export const createUserServices = (): IUserService => {
  /** 闭包级缓存，仅存非敏感展示字段，退出登录时通过 clearUserCache 清理 */
  let cachedUserInfo: CachedUserSafe | null = null;

  const clearUserCache = (): void => {
    cachedUserInfo = null;
  };

  registerServiceCacheCleaner(clearUserCache);

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

  /** 更新用户信息：按实际传入字段分别 PUT，避免「只改头像」时带空 body 误伤资料表 */
  const updateUserInfo = async (params: UpdateUserInfoRequest): Promise<void> => {
    const userInfoPayload: Record<string, string | undefined> = {};
    if (params.nickname !== undefined) userInfoPayload.nickname = params.nickname;
    if (params.realName !== undefined) userInfoPayload.realName = params.realName;
    if (params.avatar !== undefined) userInfoPayload.avatar = params.avatar;

    const userProfilePayload: Record<string, string | number | null | undefined> = {};
    if (params.sex !== undefined) userProfilePayload.sex = params.sex;
    if (params.university !== undefined) userProfilePayload.university = params.university;
    if (params.college !== undefined) userProfilePayload.college = params.college;
    if (params.major !== undefined) userProfilePayload.major = params.major;
    if (params.className !== undefined) userProfilePayload.className = params.className;
    if (params.enrollmentYear !== undefined)
      userProfilePayload.enrollmentYear = params.enrollmentYear;
    if (params.degreeLevel !== undefined) userProfilePayload.degreeLevel = params.degreeLevel;
    if (params.academicTitle !== undefined) userProfilePayload.academicTitle = params.academicTitle;

    const tasks: Promise<unknown>[] = [];
    if (Object.keys(userInfoPayload).length > 0) {
      tasks.push(UserApi.changeUserInfo(userInfoPayload));
    }
    if (Object.keys(userProfilePayload).length > 0) {
      tasks.push(UserApi.changeUserProfile(userProfilePayload));
    }
    if (tasks.length === 0) {
      return;
    }
    await Promise.all(tasks);

    cachedUserInfo = null;
  };

  return {
    getFullUserInfo,
    getUserInfo,
    updateUserInfo,
    sendEmailVerify,
    initiateUISVerify,
    checkFudanUISVerify,
    confirmEmailVerify,
    clearUserCache,
  };
};

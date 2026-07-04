import type { AdminUser } from '@/domains/Admin';
import { IDENTITY, USER_STATUS } from '@/domains/User/enum';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  AdminUserApiModel,
  FetchAdminUserListApiRequest,
  FetchAdminUserListApiResponse,
} from '../apis/AdminUserApi.type';
import type {
  FetchAdminUserListRequest,
  FetchAdminUserListResponse,
  GetAdminUserInfoResponse,
} from '../service/index.type';

const EMPTY_TEXT = '-';

const mapOptionalText = (value?: string): string => {
  return value && value.trim() ? value : EMPTY_TEXT;
};

const mapAdminUserApiModelToEntity = (raw: AdminUserApiModel): AdminUser => {
  const username = raw.username ?? '';
  const nickname = raw.nickname ?? undefined;
  const realName = raw.realName ?? undefined;
  const avatar = raw.avatar ?? undefined;
  const identityType = raw.identityType ?? 0;
  const status = raw.status ?? 0;
  const displayName = realName || nickname || username || EMPTY_TEXT;

  return {
    // fallback：兼容旧接口 userId 字段
    id: normalizeId(raw.id ?? raw.userId),
    // fallback：管理端列表的兼容空值，避免表格渲染 undefined
    username,
    usernameText: mapOptionalText(username),
    nickname,
    nicknameText: mapOptionalText(nickname),
    realName,
    avatar,
    avatarSrc: avatar,
    displayName,
    identityType,
    identityTypeLabel: IDENTITY.getLabel(identityType) || EMPTY_TEXT,
    campusNo: raw.campusNo ?? undefined,
    campusNoText: mapOptionalText(raw.campusNo ?? undefined),
    email: raw.email ?? undefined,
    emailText: mapOptionalText(raw.email ?? undefined),
    mobile: raw.mobile ?? undefined,
    verificationMode: raw.verificationMode ?? null,
    status,
    statusLabel: USER_STATUS.getLabel(status) || EMPTY_TEXT,
    createTime: raw.createTime ?? undefined,
    createTimeText: mapOptionalText(raw.createTime ?? undefined),
    updateTime: raw.updateTime ?? undefined,
  };
};

const mapFetchAdminUserListRequest = (
  params: FetchAdminUserListRequest
): FetchAdminUserListApiRequest => ({
  page: params.page,
  size: params.size,
  keyword: params.keyword,
  status: params.status,
  identityType: params.identityType,
});

const mapFetchAdminUserListFromApi = (
  data: FetchAdminUserListApiResponse
): FetchAdminUserListResponse => ({
  users: data.list.map(mapAdminUserApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapAdminUserListFromApi = (data: AdminUserApiModel[]): AdminUser[] =>
  data.map(mapAdminUserApiModelToEntity);

const mapGetAdminUserInfoFromApi = (data: {
  userInfo: AdminUserApiModel;
  userProfile?: Record<string, unknown> | null;
  readonlyFields?: string[] | null;
}): GetAdminUserInfoResponse => ({
  user: mapAdminUserApiModelToEntity(data.userInfo),
  // fallback：旧接口可能省略 userProfile
  userProfile: data.userProfile ?? null,
  // fallback：旧接口可能省略 readonlyFields
  readonlyFields: data.readonlyFields ?? null,
});

export const AdminUserServicesMap = {
  mapFetchAdminUserListRequest,
  mapFetchAdminUserListFromApi,
  mapAdminUserListFromApi,
  mapGetAdminUserInfoFromApi,
};

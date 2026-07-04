import type { AdminUser } from '@/domains/Admin';
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

const mapAdminUserApiModelToEntity = (raw: AdminUserApiModel): AdminUser => {
  return {
    // fallback：兼容旧接口 userId 字段
    id: normalizeId(raw.id ?? raw.userId),
    // fallback：管理端列表的兼容空值，避免表格渲染 undefined
    username: raw.username ?? '',
    nickname: raw.nickname ?? undefined,
    realName: raw.realName ?? undefined,
    avatar: raw.avatar ?? undefined,
    identityType: raw.identityType ?? 0,
    campusNo: raw.campusNo ?? undefined,
    email: raw.email ?? undefined,
    mobile: raw.mobile ?? undefined,
    verificationMode: raw.verificationMode ?? null,
    status: raw.status ?? 0,
    createTime: raw.createTime ?? undefined,
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

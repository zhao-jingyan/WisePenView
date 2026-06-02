import type { AdminUserApiModel } from '../apis/AdminUserApi.type';
import { AdminUserServicesMap } from '../mapper/AdminUserServices.map';
import type {
  ChangeAdminUserInfoRequest,
  ChangeAdminUserProfileRequest,
  FetchAdminUserListRequest,
  FetchAdminUserListResponse,
  GetAdminUserInfoRequest,
  GetAdminUserInfoResponse,
  IAdminService,
  ResetAdminUserPasswordRequest,
} from '../service/index.type';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rawUsers = mockdata.users as AdminUserApiModel[];

const fetchUserList = async (
  params: FetchAdminUserListRequest
): Promise<FetchAdminUserListResponse> => {
  await delay(200);
  const users = AdminUserServicesMap.mapAdminUserListFromApi(rawUsers);
  const start = (params.page - 1) * params.size;
  const list = users.slice(start, start + params.size);
  return {
    users: list,
    total: users.length,
    page: params.page,
    size: params.size,
    totalPage: Math.ceil(users.length / params.size),
  };
};

const getUserInfo = async (params: GetAdminUserInfoRequest): Promise<GetAdminUserInfoResponse> => {
  await delay(200);
  const users = AdminUserServicesMap.mapAdminUserListFromApi(rawUsers);
  const user =
    users.find((item) => item.id === params.userId) ??
    AdminUserServicesMap.mapAdminUserListFromApi([rawUsers[0]])[0];
  return {
    user,
    userProfile: null,
    readonlyFields: null,
  };
};

const changeUserInfo = async (_params: ChangeAdminUserInfoRequest): Promise<void> => {
  await delay(200);
};

const changeUserProfile = async (_params: ChangeAdminUserProfileRequest): Promise<void> => {
  await delay(200);
};

const resetPassword = async (_params: ResetAdminUserPasswordRequest): Promise<void> => {
  await delay(200);
};

export const AdminServicesMock: IAdminService = {
  fetchUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
};

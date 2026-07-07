import type { PageR } from '@/apis/api.type';
import type { UserVerificationMode } from '@/domains/User';

export type UserIdentityTypeApiValue = 1 | 2 | 3 | '1' | '2' | '3';
export type UserStatusApiValue = 'NORMAL' | 'UNIDENTIFIED' | 'BANNED';
export type UserSexApiValue = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type UserDegreeLevelApiValue = 'UNKNOWN' | 'UNDERGRADUATE' | 'MASTER' | 'DOCTOR';

export interface UserDisplayBaseApiResponse {
  nickname?: string | null;
  realName?: string | null;
  avatar?: string | null;
  identityType?: UserIdentityTypeApiValue | null;
}

interface GetUserInfoApiResponseUserInfo {
  nickname: string | null;
  realName: string | null;
  avatar: string | null;
  identityType: UserIdentityTypeApiValue;
  username: string;
  campusNo: string;
  email: string | null;
  mobile: string | null;
  verificationMode: UserVerificationMode | null;
  status: UserStatusApiValue;
}

interface GetUserInfoApiResponseUserProfile {
  sex: UserSexApiValue;
  university: string | null;
  college: string | null;
  major: string | null;
  className: string | null;
  enrollmentYear: number | string | null;
  degreeLevel: UserDegreeLevelApiValue;
  academicTitle: string | null;
}

export interface GetUserInfoApiResponse {
  userId?: string | number;
  userInfo: GetUserInfoApiResponseUserInfo;
  userProfile: GetUserInfoApiResponseUserProfile;
  readonlyFields: string[] | null;
}

export interface SearchUserApiRequest {
  keyword: string;
}

export interface ListUserSearchSuggestionsApiRequest {
  keyword: string;
  size?: number;
}

export interface UserSearchUserApiResponse extends UserDisplayBaseApiResponse {
  userId: string | number;
  username: string;
}

export interface ChangeUserInfoApiRequest {
  nickname?: string;
  realName?: string;
  avatar?: string;
}

export interface ChangeUserProfileApiRequest {
  sex?: string;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: number;
  degreeLevel?: string;
  academicTitle?: string;
}

export interface InitiateEmailVerifyApiRequest {
  email: string;
}

export interface InitiateFudanUISVerifyApiRequest {
  uisAccount: string;
  uisPassword: string;
}

export interface CheckEmailVerifyApiRequest {
  token: string;
}

export interface ListAdminMessagesApiRequest {
  page: number;
  size: number;
}

export interface AdminMessageApiModel {
  messageId?: string | number | null;
  deliveryScope?: string | null;
  messageType?: string | null;
  title?: string | null;
  content?: string | null;
  jumpUrl?: string | null;
  extra?: string | null;
  readCount?: number | null;
  createTime?: string | null;
}

export type ListAdminMessagesApiResponse = PageR<AdminMessageApiModel>;

export type PublishMessageApiDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type PublishMessageApiType = 'SYSTEM' | 'NORMAL';

export interface PublishMessageApiRequest {
  receiverUserIds: string[];
  deliveryScope: PublishMessageApiDeliveryScope;
  messageType: PublishMessageApiType;
  title: string;
  content: string;
  jumpUrl?: string;
  extra?: string;
}

export interface RedeemVoucherApiRequest {
  voucherCode: string;
}

export type ListTransactionsApiRequest = Record<string, string | number | undefined>;

export interface TransferTokenBetweenGroupAndUserApiRequest {
  groupId: string;
  tokenCount: number;
  tokenTransferType: 1 | 2;
}

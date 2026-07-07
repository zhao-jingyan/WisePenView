import { apiGet, apiPost, apiPut } from '@/apis/request';
import type {
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  GetUserInfoApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListTransactionsApiRequest,
  ListUserSearchSuggestionsApiRequest,
  RedeemVoucherApiRequest,
  SearchUserApiRequest,
  TransferTokenBetweenGroupAndUserApiRequest,
  UserSearchUserApiResponse,
} from './UserApi.type';

/** User API: /user/* */

function getUserInfo(): Promise<GetUserInfoApiResponse> {
  return apiGet('/user/getUserInfo');
}

function searchUser(req: SearchUserApiRequest): Promise<UserSearchUserApiResponse[]> {
  return apiGet('/user/searchUser', { params: req });
}

function listUserSearchSuggestions(
  req: ListUserSearchSuggestionsApiRequest
): Promise<UserSearchUserApiResponse[]> {
  return apiGet('/user/listUserSearchSuggestions', { params: req });
}

function initiateEmailVerify(req: InitiateEmailVerifyApiRequest): Promise<void> {
  return apiPost('/user/verify/initiateEmailVerify', null, { params: req });
}

function initiateFudanUISVerify(req: InitiateFudanUISVerifyApiRequest): Promise<void> {
  return apiPost('/user/verify/initiateFudanUISVerify', null, { params: req });
}

function checkFudanUISVerify(): Promise<unknown> {
  return apiGet('/user/verify/checkFudanUISVerify');
}

function checkEmailVerify(req: CheckEmailVerifyApiRequest): Promise<void> {
  return apiGet('/user/verify/checkEmailVerify', { params: req });
}

function changeUserInfo(req: ChangeUserInfoApiRequest): Promise<void> {
  return apiPut('/user/changeUserInfo', req);
}

function changeUserProfile(req: ChangeUserProfileApiRequest): Promise<void> {
  return apiPut('/user/changeUserProfile', req);
}

export const UserApi = {
  getUserInfo,
  searchUser,
  listUserSearchSuggestions,
  initiateEmailVerify,
  initiateFudanUISVerify,
  checkFudanUISVerify,
  checkEmailVerify,
  changeUserInfo,
  changeUserProfile,
};

/** User Wallet API: /user/wallet/* */

function getUserWalletInfo(): Promise<Record<string, unknown>> {
  return apiGet('/user/wallet/getUserWalletInfo');
}

function redeemVoucher(req: RedeemVoucherApiRequest): Promise<void> {
  return apiPost('/user/wallet/redeemVoucher', req);
}

function listTransactions(req: ListTransactionsApiRequest): Promise<Record<string, unknown>> {
  return apiGet('/user/wallet/listTransactions', { params: req });
}

function transferTokenBetweenGroupAndUser(
  req: TransferTokenBetweenGroupAndUserApiRequest
): Promise<void> {
  return apiPost('/user/wallet/transferTokenBetweenGroupAndUser', req);
}

export const UserWalletApi = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
};

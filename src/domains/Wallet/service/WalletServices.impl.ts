/**
 * 钱包 Service：/user/wallet/*，成功码与全局一致 `code === 200`。
 */
import { UserWalletApi } from '@/domains/User/apis/UserApi';
import { WALLET_TX_TAB_MERGE_FETCH_CAP } from '@/domains/Wallet';
import { WalletServicesMap } from '../mapper/WalletServices.map';
import { mergeWalletTransactionPages } from './WalletServices.helper';
import type {
  GetWalletInfoResponse,
  IWalletService,
  ListMergedWalletTransactionsRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './index.type';

const getUserWalletInfo = async (): Promise<GetWalletInfoResponse> => {
  const data = await UserWalletApi.getUserWalletInfo();
  return WalletServicesMap.mapGetUserWalletInfoFromApi(data);
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  const payload = WalletServicesMap.mapRedeemVoucherRequest(params);
  await UserWalletApi.redeemVoucher(payload);
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query = WalletServicesMap.mapListTransactionsRequest(params);
  const data = await UserWalletApi.listTransactions(query);
  return WalletServicesMap.mapListTransactionsFromApi(data);
};

const listMergedTransactions = async (
  params: ListMergedWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const { groupId, page = 1, size = 20, typeA, typeB } = params;
  const cap = WALLET_TX_TAB_MERGE_FETCH_CAP;
  const [ra, rb] = await Promise.all([
    listTransactions({ groupId, page: 1, size: cap, type: typeA }),
    listTransactions({ groupId, page: 1, size: cap, type: typeB }),
  ]);
  return mergeWalletTransactionPages(ra, rb, page, size);
};

const transferTokenBetweenGroupAndUser = async (
  params: TransferTokenBetweenGroupAndUserRequest
): Promise<void> => {
  const payload = WalletServicesMap.mapTransferTokenBetweenGroupAndUserRequest(params);
  await UserWalletApi.transferTokenBetweenGroupAndUser(payload);
};

export const createWalletServices = (): IWalletService => ({
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  listMergedTransactions,
  transferTokenBetweenGroupAndUser,
});

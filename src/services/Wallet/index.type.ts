import type { WalletTransactionRecord } from '@/types/wallet';

/**
 * IWalletService：/user/wallet 下个人钱包、流水、点卡兑换（仅本人）、组长↔小组划拨。
 */

/** GET /user/wallet/getUserWalletInfo — 无参为当前用户；可选 groupId 查小组池（与后端约定一致时） */
export interface GetUserWalletInfoRequest {
  groupId?: string | number | null;
}

export interface GetWalletInfoResponse {
  tokenBalance: number;
  tokenUsed: number;
  balance: number;
}

/** POST /user/wallet/redeemVoucher — 仅兑换到当前登录用户 */
export interface RedeemVoucherRequest {
  voucherCode: string;
}

/** POST /user/wallet/transferTokenBetweenGroupAndUser */
export interface TransferTokenBetweenGroupAndUserRequest {
  groupId: number | string;
  tokenCount: number;
  tokenTransferType: 1 | 2;
}

/** GET /user/wallet/listTransactions — groupId 空则查用户流水 */
export interface ListWalletTransactionsRequest {
  groupId?: string | number | null;
  page?: number;
  size?: number;
  /** 不传：不按类型筛选；1 REFILL 2 SPEND 3 TRANSFER_IN 4 TRANSFER_OUT */
  type?: number;
}

export interface ListWalletTransactionsResponse {
  total: number;
  records: WalletTransactionRecord[];
}

export interface IWalletService {
  getUserWalletInfo(params?: GetUserWalletInfoRequest): Promise<GetWalletInfoResponse>;
  redeemVoucher(params: RedeemVoucherRequest): Promise<void>;
  listTransactions(params: ListWalletTransactionsRequest): Promise<ListWalletTransactionsResponse>;
  transferTokenBetweenGroupAndUser(params: TransferTokenBetweenGroupAndUserRequest): Promise<void>;
}

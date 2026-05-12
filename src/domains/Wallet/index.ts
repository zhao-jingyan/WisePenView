/** 对外仅导出类型；实现放在 WalletServices.impl / Mock，由 ServicesContext 注入 */
export type { GroupQuotaInfo, UserGroupQuota } from './entity/quota';
export type { WalletTransactionKind, WalletTransactionRecord } from './entity/wallet';
export type {
  GetWalletInfoResponse,
  IWalletService,
  ListMergedWalletTransactionsRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './service/index.type';

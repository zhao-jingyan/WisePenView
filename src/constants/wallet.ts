/**
 * 钱包展示主体（仅前端区分个人 / 小组 Tab，接口统一走 /user/wallet）。
 */
export const WALLET_TARGET_TYPE = { USER: 1, GROUP: 2 } as const;
export type WalletTargetType = (typeof WALLET_TARGET_TYPE)[keyof typeof WALLET_TARGET_TYPE];

/**
 * listTransactions 的 type（与后端枚举一致）。
 * 「全部」不传 type；Tab「充值」→ 1；「消费」→ 2；3/4 仅在「全部」中出现。
 */
export const WALLET_TOKEN_TX_TYPE = {
  REFILL: 1,
  SPEND: 2,
  TRANSFER_IN: 3,
  TRANSFER_OUT: 4,
} as const;

/** Owner↔Group 划拨：1 转入小组，2 转回组长 */
export const WALLET_TOKEN_TRANSFER_TYPE = { TO_GROUP: 1, TO_OWNER: 2 } as const;

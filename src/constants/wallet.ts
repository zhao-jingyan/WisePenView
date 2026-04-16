/**
 * 钱包展示主体（仅前端区分个人 / 小组 Tab，接口统一走 /user/wallet）。
 */
export const WALLET_TARGET_TYPE = { USER: 1, GROUP: 2 } as const;
export type WalletTargetType = (typeof WALLET_TARGET_TYPE)[keyof typeof WALLET_TARGET_TYPE];

/**
 * listTransactions 可选 type（与后端 TokenTransactionType 数值一致，Service 层会转为枚举名）。
 * 「全部」不传；个人 Tab「充值」→ REFILL；小组「充值」前端合并 REFILL + TRANSFER_IN（划入）；「消费」合并 SPEND + TRANSFER_OUT。
 */
export const WALLET_TOKEN_TX_TYPE = {
  REFILL: 1,
  SPEND: 2,
  TRANSFER_IN: 3,
  TRANSFER_OUT: 4,
} as const;

/**
 * listTransactions 查询参数 type 的取值：须与后端 TokenTransactionType.name 一致。
 * Spring 对枚举 Query 一般按枚举名绑定，传数字会 400。
 */
export const WALLET_LIST_TX_TYPE_QUERY_VALUE = {
  [WALLET_TOKEN_TX_TYPE.REFILL]: 'REFILL',
  [WALLET_TOKEN_TX_TYPE.SPEND]: 'SPEND',
  [WALLET_TOKEN_TX_TYPE.TRANSFER_IN]: 'TRANSFER_IN',
  [WALLET_TOKEN_TX_TYPE.TRANSFER_OUT]: 'TRANSFER_OUT',
} as const satisfies Record<number, string>;

/** Owner↔Group 划拨：1 转入小组，2 转回组长 */
export const WALLET_TOKEN_TRANSFER_TYPE = { TO_GROUP: 1, TO_OWNER: 2 } as const;

/** Tab 内合并两类流水时，每类 listTransactions 的 size 上限（超出则分页可能不完整） */
export const WALLET_TX_TAB_MERGE_FETCH_CAP = 500;

import { createEnum } from '@/utils/enum';

/**
 * 钱包展示主体（仅前端区分个人 / 小组 Tab，接口统一走 /user/wallet）。
 */
export const WALLET_TARGET = createEnum([
  { value: 1, key: 'USER', label: '个人' },
  { value: 2, key: 'GROUP', label: '小组' },
] as const);
export const WALLET_TARGET_TYPE = WALLET_TARGET.values;
export type WalletTargetType = (typeof WALLET_TARGET.options)[number]['value'];

/**
 * listTransactions 可选 type（与后端 TokenTransactionType 数值一致，Service 层会转为枚举名）。
 * 「全部」不传；个人 Tab「充值」-> REFILL；小组「充值」前端合并 REFILL + TRANSFER_IN（划入）；「消费」合并 SPEND + TRANSFER_OUT。
 */
export const WALLET_TOKEN_TX = createEnum([
  { value: 1, key: 'REFILL', label: '充值' },
  { value: 2, key: 'SPEND', label: '消费' },
  { value: 3, key: 'TRANSFER_IN', label: '划入' },
  { value: 4, key: 'TRANSFER_OUT', label: '划出' },
] as const);
export const WALLET_TOKEN_TX_TYPE = WALLET_TOKEN_TX.values;

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

/** Owner<->Group 划拨：1 转入小组，2 转回组长 */
export const WALLET_TOKEN_TRANSFER = createEnum([
  { value: 1, key: 'TO_GROUP', label: '转入小组' },
  { value: 2, key: 'TO_OWNER', label: '转回组长' },
] as const);
export const WALLET_TOKEN_TRANSFER_TYPE = WALLET_TOKEN_TRANSFER.values;

/** Tab 内合并两类流水时，每类 listTransactions 的 size 上限（超出则分页可能不完整） */
export const WALLET_TX_TAB_MERGE_FETCH_CAP = 500;

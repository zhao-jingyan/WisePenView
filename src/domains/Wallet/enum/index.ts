import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/**
 * 钱包展示主体（仅前端区分个人 / 小组 Tab，接口统一走 /user/wallet）。
 */
export const WALLET_TARGET_TYPE = createEnum([
  { value: 1, key: 'USER', label: '个人' },
  { value: 2, key: 'GROUP', label: '小组' },
] as const);
export type WalletTargetType = EnumValue<typeof WALLET_TARGET_TYPE>;

/**
 * listTransactions 可选 type（与后端 TokenTransactionType 数值一致，Service 层会转为枚举名）。
 * 「全部」不传；个人 Tab「充值」-> REFILL；小组「充值」前端合并 REFILL + TRANSFER_IN（划入）；「消费」合并 SPEND + TRANSFER_OUT。
 */
export const WALLET_TOKEN_TX_TYPE = createEnum([
  { value: 1, key: 'REFILL', label: '充值' },
  { value: 2, key: 'SPEND', label: '消费' },
  { value: 3, key: 'TRANSFER_IN', label: '划入' },
  { value: 4, key: 'TRANSFER_OUT', label: '划出' },
] as const);

/** Owner<->Group 划拨：1 转入小组，2 转回组长 */
export const WALLET_TOKEN_TRANSFER_TYPE = createEnum([
  { value: 1, key: 'TO_GROUP', label: '转入小组' },
  { value: 2, key: 'TO_OWNER', label: '转回组长' },
] as const);

/** Tab 内合并两类流水时，每类 listTransactions 的单次请求页大小 */
export const WALLET_TX_TAB_MERGE_PAGE_SIZE = 200;

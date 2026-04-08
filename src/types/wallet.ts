/**
 * 钱包流水领域类型；由 /user/wallet/listTransactions 的 list 项映射。
 */

/** 展示用分类（含小组划拨流水） */
export type WalletTransactionKind = 'RECHARGE' | 'SPEND' | 'TRANSFER_IN' | 'TRANSFER_OUT';

/**
 * 接口：traceId、tokenTransactionType、tokenCount（可为字符串）、meta、operatorName、createTime。
 */
export interface WalletTransactionRecord {
  traceId: string;
  time: string;
  type: WalletTransactionKind;
  amount: number;
  title: string;
  subTitle: string;
  operatorName?: string;
}

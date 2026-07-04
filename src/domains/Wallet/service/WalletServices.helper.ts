import type { WalletTransactionRecord } from '@/domains/Wallet';
import type { ListWalletTransactionsResponse } from './index.type';

const txRecordDedupeKey = (record: WalletTransactionRecord): string => {
  if (record.traceId.length > 0) {
    return record.traceId;
  }
  return `${record.time}\u0000${record.type}\u0000${record.amount}`;
};

const compareWalletTxTimeDesc = (a: WalletTransactionRecord, b: WalletTransactionRecord): number =>
  String(b.time).localeCompare(String(a.time));

export const mergeWalletTransactionPages = (
  first: ListWalletTransactionsResponse,
  second: ListWalletTransactionsResponse,
  page: number,
  size: number
): ListWalletTransactionsResponse => {
  const byKey = new Map<string, WalletTransactionRecord>();
  for (const record of first.records) {
    byKey.set(txRecordDedupeKey(record), record);
  }
  for (const record of second.records) {
    byKey.set(txRecordDedupeKey(record), record);
  }

  const merged = Array.from(byKey.values());
  merged.sort(compareWalletTxTimeDesc);

  const total = first.total + second.total;
  const start = (page - 1) * size;
  const end = start + size;
  return {
    total,
    records: merged.slice(start, end),
  };
};

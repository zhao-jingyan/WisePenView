/**
 * 钱包 Service：/user/wallet/*，成功码与全局一致 `code === 200`。
 */
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { WalletTransactionKind, WalletTransactionRecord } from '@/types/wallet';
import type {
  GetUserWalletInfoRequest,
  GetWalletInfoResponse,
  RedeemVoucherRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  TransferTokenBetweenGroupAndUserRequest,
  IWalletService,
} from './index.type';

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const mapTokenTransactionTypeToKind = (raw: unknown, tokenCount: number): WalletTransactionKind => {
  const n = Number(raw);
  if (n === 1) return 'RECHARGE';
  if (n === 2) return 'SPEND';
  if (n === 3) return 'TRANSFER_IN';
  if (n === 4) return 'TRANSFER_OUT';
  if (tokenCount > 0) return 'RECHARGE';
  if (tokenCount < 0) return 'SPEND';
  return 'SPEND';
};

const titleForKind = (k: WalletTransactionKind): string => {
  switch (k) {
    case 'RECHARGE':
      return '充值';
    case 'SPEND':
      return '消费';
    case 'TRANSFER_IN':
      return '划入';
    case 'TRANSFER_OUT':
      return '划出';
    default:
      return '流水';
  }
};

/** list 项：tokenTransactionType、tokenCount、meta、createTime 等 */
const mapTransactionRow = (row: Record<string, unknown>): WalletTransactionRecord => {
  const amountNum = toNum(row.tokenCount ?? row.amount, 0);
  const hasTxType = row.tokenTransactionType !== undefined && row.tokenTransactionType !== null;
  const kind = hasTxType
    ? mapTokenTransactionTypeToKind(row.tokenTransactionType, amountNum)
    : mapTokenTransactionTypeToKind(row.changeType, amountNum);
  const time = String(row.createTime ?? row.time ?? row.createdAt ?? '');
  const titleFromApi =
    row.title != null && String(row.title).trim().length > 0 ? String(row.title) : '';
  const title = titleFromApi || titleForKind(kind);
  const subFromMeta = row.meta != null && String(row.meta).length > 0 ? String(row.meta) : '';
  const subFromLegacy =
    row.subTitle != null && String(row.subTitle).length > 0
      ? String(row.subTitle)
      : String(row.subtitle ?? '');
  const subTitle = subFromMeta || subFromLegacy;
  return {
    traceId: String(row.traceId ?? row.id ?? ''),
    time,
    type: kind,
    amount: amountNum,
    title,
    subTitle,
    operatorName:
      row.operatorName != null && String(row.operatorName).trim().length > 0
        ? String(row.operatorName)
        : undefined,
  };
};

const getUserWalletInfo = async (
  params?: GetUserWalletInfoRequest
): Promise<GetWalletInfoResponse> => {
  const q: Record<string, string | number> = {};
  const gid = params?.groupId;
  if (gid != null && gid !== '') {
    q.groupId = typeof gid === 'string' ? gid : gid;
  }
  const res = (await Axios.get('/user/wallet/getUserWalletInfo', {
    params: q,
  })) as ApiResponse<Record<string, unknown>>;
  checkResponse(res);
  const data = res.data ?? {};
  const tokenBalance = toNum(
    data.tokenBalance ?? data.TokenBalance ?? data.balance ?? data.Balance,
    0
  );
  const tokenUsed = toNum(data.tokenUsed ?? data.TokenUsed, 0);
  return {
    tokenBalance,
    tokenUsed,
    balance: tokenBalance,
  };
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  const res = (await Axios.post('/user/wallet/redeemVoucher', {
    voucherCode: params.voucherCode,
  })) as ApiResponse<unknown>;
  checkResponse(res);
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    size: params.size ?? 20,
  };
  const gid = params.groupId;
  if (gid != null && gid !== '') {
    query.groupId = typeof gid === 'number' ? gid : gid;
  }
  if (params.type !== undefined && params.type !== null) {
    query.type = params.type;
  }
  const res = (await Axios.get('/user/wallet/listTransactions', {
    params: query,
  })) as ApiResponse<Record<string, unknown>>;
  checkResponse(res);
  const data = (res.data ?? {}) as Record<string, unknown>;
  const rawList = data.list ?? data.records ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  const records = list
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
    .map((r) => mapTransactionRow(r));
  return { total: toNum(data.total, records.length), records };
};

const transferTokenBetweenGroupAndUser = async (
  params: TransferTokenBetweenGroupAndUserRequest
): Promise<void> => {
  const gid = typeof params.groupId === 'string' ? Number(params.groupId) : params.groupId;
  const res = (await Axios.post('/user/wallet/transferTokenBetweenGroupAndUser', {
    groupId: gid,
    tokenCount: params.tokenCount,
    tokenTransferType: params.tokenTransferType,
  })) as ApiResponse<unknown>;
  checkResponse(res);
};

export const WalletServicesImpl: IWalletService = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
};

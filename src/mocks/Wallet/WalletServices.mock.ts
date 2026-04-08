/**
 * 钱包 Mock：MODE === 'mock'；接口形态与 /user/wallet 对齐。
 */
import type { IWalletService } from '@/services/Wallet';
import type { WalletTransactionRecord } from '@/types/wallet';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockPersonalBalance = Number(mockdata.tokenBalance) || 0;
let mockGroupBalance = 800;
const mockTokenUsed = Number(mockdata.tokenUsed) || 0;
const allRecords = [...(mockdata.transactions.records as WalletTransactionRecord[])];

const getUserWalletInfo: IWalletService['getUserWalletInfo'] = async (params) => {
  await delay(280);
  if (params?.groupId != null && params.groupId !== '') {
    return {
      tokenBalance: mockGroupBalance,
      tokenUsed: mockTokenUsed,
      balance: mockGroupBalance,
    };
  }
  return {
    tokenBalance: mockPersonalBalance,
    tokenUsed: mockTokenUsed,
    balance: mockPersonalBalance,
  };
};

const redeemVoucher: IWalletService['redeemVoucher'] = async (params) => {
  await delay(400);
  const code = params.voucherCode.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== 16) {
    throw new Error('请输入 16 位兑换码');
  }
  if (code === '0000000000000000') {
    throw new Error('点卡已使用');
  }
  if (code === 'FFFFFFFFFFFFFFFF') {
    throw new Error('无效兑换码');
  }
  const amount = 500;
  mockPersonalBalance += amount;
  const traceId = `mock-${Date.now()}`;
  allRecords.unshift({
    traceId,
    time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    type: 'RECHARGE',
    amount,
    title: '充值',
    subTitle: `****${code.slice(-4)}`,
    operatorName: '我',
  });
};

const listTransactions: IWalletService['listTransactions'] = async (params) => {
  await delay(260);
  const { page = 1, size = 20, type: typeParam } = params;
  let rows = [...allRecords];
  if (typeParam === 1) {
    rows = rows.filter((r) => r.type === 'RECHARGE');
  } else if (typeParam === 2) {
    rows = rows.filter((r) => r.type === 'SPEND');
  }
  const start = (page - 1) * size;
  const slice = rows.slice(start, start + size);
  return { total: rows.length, records: slice };
};

const transferTokenBetweenGroupAndUser: IWalletService['transferTokenBetweenGroupAndUser'] = async (
  params
) => {
  await delay(200);
  const n = params.tokenCount;
  if (params.tokenTransferType === 1) {
    mockPersonalBalance = Math.max(0, mockPersonalBalance - n);
    mockGroupBalance += n;
  } else {
    mockGroupBalance = Math.max(0, mockGroupBalance - n);
    mockPersonalBalance += n;
  }
};

export const WalletServicesMock: IWalletService = {
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  transferTokenBetweenGroupAndUser,
};

/**
 * 通用计算点钱包：个人余额走 /user/wallet；小组余额走 groupService.getGroupWalletInfo。
 * 点卡充值仅个人（redeemVoucher）；小组余额由组长通过「token 划拨」转入。
 * 交易明细 Tab：全部 / 充值 / 消费。
 * 个人「充值」仅 REFILL；小组「充值」合并 REFILL+TRANSFER_IN；「消费」合并 SPEND+TRANSFER_OUT；其余走单 type。
 * 数据请求使用 ahooks（不使用 useEffect）。
 */
import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { usePagination, useRequest, useUnmount } from 'ahooks';
import { Button, Pagination, Skeleton, Table, Tabs } from 'antd';
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiSubtractLine } from 'react-icons/ri';
import RechargeModal from '@/components/Wallet/RechargeModal';
import {
  WALLET_TARGET_TYPE,
  WALLET_TOKEN_TX_TYPE,
  WALLET_TX_TAB_MERGE_FETCH_CAP,
} from '@/constants/wallet';
import { useGroupService, useWalletService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { IWalletService } from '@/services/Wallet';
import type { WalletTransactionKind, WalletTransactionRecord } from '@/types/wallet';
import { formatCompactNumber } from '@/utils/number';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { formatTimestampToDateTime } from '@/utils/time';
import type { ComputeWalletProps, ComputeWalletRef } from './index.type';
import styles from './style.module.less';

const PAGE_SIZE = 20;

type TxTabKey = 'all' | 'recharge' | 'spend';

type WalletTxTypeQueryCode = (typeof WALLET_TOKEN_TX_TYPE)[keyof typeof WALLET_TOKEN_TX_TYPE];

const tabToListType = (key: TxTabKey): number | undefined => {
  if (key === 'recharge') return WALLET_TOKEN_TX_TYPE.REFILL;
  if (key === 'spend') return WALLET_TOKEN_TX_TYPE.SPEND;
  return undefined;
};

const isInflowKind = (k: WalletTransactionKind): boolean => k === 'RECHARGE' || k === 'TRANSFER_IN';

/** 掩码行展示：全角 *、- 与半角混排时视觉大小不一，先规范再交给 summarySub 等宽样式 */
const normalizeMaskDisplayText = (s: string): string =>
  s.replace(/\uFF0A/g, '*').replace(/\uFF0D/g, '-');

const txRecordDedupeKey = (r: WalletTransactionRecord): string =>
  r.traceId.length > 0 ? r.traceId : `${r.time}\u0000${r.type}\u0000${r.amount}`;

const compareWalletTxTimeDesc = (a: WalletTransactionRecord, b: WalletTransactionRecord): number =>
  String(b.time).localeCompare(String(a.time));

/** Tab 内合并两类流水：并行 listTransactions，合并去重、时间倒序再本地分页 */
const mergeTwoTxTypesForTab = async (
  wallet: IWalletService,
  args: { groupId?: string; page: number; size: number },
  typeA: WalletTxTypeQueryCode,
  typeB: WalletTxTypeQueryCode
): Promise<{ list: WalletTransactionRecord[]; total: number }> => {
  const { groupId, page, size } = args;
  const cap = WALLET_TX_TAB_MERGE_FETCH_CAP;
  const [ra, rb] = await Promise.all([
    wallet.listTransactions({ groupId, page: 1, size: cap, type: typeA }),
    wallet.listTransactions({ groupId, page: 1, size: cap, type: typeB }),
  ]);
  const map = new Map<string, WalletTransactionRecord>();
  for (const r of ra.records) map.set(txRecordDedupeKey(r), r);
  for (const r of rb.records) map.set(txRecordDedupeKey(r), r);
  const merged = [...map.values()].sort(compareWalletTxTimeDesc);
  const total = ra.total + rb.total;
  const start = (page - 1) * size;
  return { list: merged.slice(start, start + size), total };
};

const typeLabel = (k: WalletTransactionKind): string => {
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

const ComputeWallet = React.forwardRef<ComputeWalletRef, ComputeWalletProps>(
  (
    {
      targetType,
      targetId,
      canRecharge,
      groupDisplayName,
      showOperatorColumn = false,
      surface = 'card',
    },
    ref
  ) => {
    const walletService = useWalletService();
    const groupService = useGroupService();
    const message = useAppMessage();

    const effectiveGroupId = targetType === WALLET_TARGET_TYPE.GROUP ? (targetId ?? '').trim() : '';
    const walletReady = targetType === WALLET_TARGET_TYPE.USER || Boolean(effectiveGroupId);

    const [displayBalance, setDisplayBalance] = useState(0);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [txTab, setTxTab] = useState<TxTabKey>('all');
    const txTabRef = useRef<TxTabKey>('all');
    const [rechargeOpen, setRechargeOpen] = useState(false);
    const [flashFirstRow, setFlashFirstRow] = useState(false);
    const firstBalanceRef = useRef(true);
    const rafRef = useRef<number | null>(null);
    const displayBalanceRef = useRef(0);

    /** 与展示余额同步更新 ref，供充值成功动画起点读取（禁止在 render 中写 ref） */
    const commitDisplayBalance = useCallback((value: number) => {
      displayBalanceRef.current = value;
      setDisplayBalance(value);
    }, []);

    const runBalanceAnimation = useCallback((from: number, to: number) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      const duration = 650;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 2;
        const next = Math.round(from + (to - from) * eased);
        displayBalanceRef.current = next;
        setDisplayBalance(next);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }, []);

    const { runAsync: loadBalance } = useRequest(
      async (options?: { animateFrom?: number; silent?: boolean }) => {
        if (targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId) {
          const groupBalance = await groupService.getGroupWalletInfo({ groupId: effectiveGroupId });
          return { balance: groupBalance, options };
        }
        const data = await walletService.getUserWalletInfo();
        return { balance: data.balance, options };
      },
      {
        ready: walletReady,
        refreshDeps: [walletService, groupService, targetType, effectiveGroupId],
        onBefore: (params) => {
          const options = params?.[0];
          if (!options?.silent) {
            setLoadingWallet(true);
          }
        },
        onSuccess: (res) => {
          const { balance, options } = res;
          if (firstBalanceRef.current) {
            commitDisplayBalance(balance);
            firstBalanceRef.current = false;
          } else if (options?.animateFrom !== undefined) {
            runBalanceAnimation(options.animateFrom, balance);
          } else {
            commitDisplayBalance(balance);
          }
          if (!options?.silent) {
            setLoadingWallet(false);
          }
        },
        onError: (err, params) => {
          message.error(parseErrorMessage(err, '获取余额失败'));
          const options = params?.[0];
          if (!options?.silent) {
            setLoadingWallet(false);
          }
        },
      }
    );

    const {
      data: txData,
      loading: loadingTx,
      refresh: refreshTransactions,
      pagination: { current: page = 1, total = 0, onChange: onTxPageChange },
    } = usePagination(
      async ({ current, pageSize }) => {
        const tab = txTabRef.current;
        const gid =
          targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId
            ? effectiveGroupId
            : undefined;

        if (tab === 'spend') {
          return mergeTwoTxTypesForTab(
            walletService,
            { groupId: gid, page: current, size: pageSize },
            WALLET_TOKEN_TX_TYPE.SPEND,
            WALLET_TOKEN_TX_TYPE.TRANSFER_OUT
          );
        }

        if (tab === 'recharge' && targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId) {
          return mergeTwoTxTypesForTab(
            walletService,
            { groupId: effectiveGroupId, page: current, size: pageSize },
            WALLET_TOKEN_TX_TYPE.REFILL,
            WALLET_TOKEN_TX_TYPE.TRANSFER_IN
          );
        }

        const listType = tabToListType(tab);
        const { total: nextTotal, records } = await walletService.listTransactions({
          groupId: gid,
          page: current,
          size: pageSize,
          ...(listType !== undefined ? { type: listType } : {}),
        });
        return { list: records, total: nextTotal };
      },
      {
        ready: walletReady,
        defaultCurrent: 1,
        defaultPageSize: PAGE_SIZE,
        refreshDeps: [walletService, targetType, effectiveGroupId, txTab],
        onError: (err) => {
          message.error(parseErrorMessage(err, '获取交易明细失败'));
        },
      }
    );

    const refreshWalletData = useCallback(async () => {
      await Promise.all([loadBalance({ silent: true }), Promise.resolve(refreshTransactions())]);
    }, [loadBalance, refreshTransactions]);

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          await refreshWalletData();
        },
      }),
      [refreshWalletData]
    );

    useUnmount(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    });

    const personalRecharge = targetType === WALLET_TARGET_TYPE.USER && canRecharge;

    const { runAsync: runRecharge } = useRequest(
      async (code: string) => walletService.redeemVoucher({ voucherCode: code }),
      {
        manual: true,
        onSuccess: async () => {
          const from = displayBalanceRef.current;
          message.success('充值成功');
          await loadBalance({ animateFrom: from, silent: true });
          onTxPageChange(1, PAGE_SIZE);
          setFlashFirstRow(true);
          window.setTimeout(() => setFlashFirstRow(false), 2400);
        },
        onError: (err) => {
          message.error(parseErrorMessage(err, '充值失败'));
        },
      }
    );

    const handleRechargeSubmit = async (code: string) => {
      if (!personalRecharge) {
        return;
      }
      await runRecharge(code);
    };

    const handleTxTabChange = (key: string) => {
      const next = key as TxTabKey;
      txTabRef.current = next;
      setTxTab(next);
      onTxPageChange(1, PAGE_SIZE);
    };

    type Row = WalletTransactionRecord & { key: React.Key };

    const columns = useMemo(() => {
      const cols: {
        title: string;
        dataIndex?: string;
        key: string;
        width?: number;
        align?: 'right';
        render?: (v: unknown, row: Row) => React.ReactNode;
      }[] = [
        {
          title: '时间',
          dataIndex: 'time',
          key: 'time',
          width: 180,
          render: (time: unknown) =>
            formatTimestampToDateTime(time as string | number | null) || '—',
        },
        {
          title: '类型',
          dataIndex: 'type',
          key: 'type',
          width: 120,
          render: (t: unknown) => {
            const kind = t as WalletTransactionKind;
            const inflow = isInflowKind(kind);
            return (
              <span className={styles.typeCell}>
                {inflow ? (
                  <>
                    <RiArrowUpLine size={16} className={styles.amountRecharge} />
                    <RiAddLine size={14} className={styles.amountRecharge} />
                    <span>{typeLabel(kind)}</span>
                  </>
                ) : (
                  <>
                    <RiArrowDownLine size={16} className={styles.amountSpend} />
                    <RiSubtractLine size={14} className={styles.amountSpend} />
                    <span>{typeLabel(kind)}</span>
                  </>
                )}
              </span>
            );
          },
        },
        {
          title: '摘要 / 备注',
          key: 'summary',
          render: (_: unknown, row: Row) => (
            <div>
              <div className={styles.summaryMain}>{row.title || '—'}</div>
              <div className={styles.summarySub}>
                {row.subTitle ? normalizeMaskDisplayText(row.subTitle) : '—'}
              </div>
            </div>
          ),
        },
        {
          title: '变动金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 120,
          align: 'right',
          render: (amount: unknown, row: Row) => {
            const inflow = isInflowKind(row.type);
            const n = Number(amount);
            const prefix = n > 0 ? '+' : '';
            return (
              <span className={inflow ? styles.amountRecharge : styles.amountSpend}>
                {prefix}
                {formatCompactNumber(n)}
              </span>
            );
          },
        },
      ];
      if (showOperatorColumn) {
        cols.push({
          title: '操作人',
          dataIndex: 'operatorName',
          key: 'operatorName',
          width: 120,
          render: (name: unknown) => (name != null && String(name).length > 0 ? String(name) : '—'),
        });
      }
      return cols;
    }, [showOperatorColumn]);

    const dataSource = useMemo(
      () =>
        (txData?.list ?? []).map((r: WalletTransactionRecord) => ({
          ...r,
          key: r.traceId || r.time,
        })),
      [txData?.list]
    );

    const rootClass = surface === 'plain' ? styles.plain : styles.card;

    return (
      <div className={rootClass}>
        <div className={styles.assetRow}>
          <div className={styles.balanceBlock}>
            <p className={styles.balanceLabel}>计算点余额</p>
            {loadingWallet ? (
              <Skeleton.Input active style={{ width: 200, height: 44 }} />
            ) : (
              <p className={styles.balanceValue}>
                {displayBalance}
                <span className={styles.unit}>计算点</span>
              </p>
            )}
          </div>
          {personalRecharge ? (
            <Button type="primary" onClick={() => setRechargeOpen(true)}>
              充值
            </Button>
          ) : null}
        </div>

        <h3 className={styles.panelTitle}>交易明细</h3>
        <Tabs
          className={styles.tabs}
          activeKey={txTab}
          onChange={handleTxTabChange}
          items={[
            { key: 'all', label: '全部' },
            { key: 'recharge', label: '充值' },
            { key: 'spend', label: '消费' },
          ]}
        />

        <Table
          size="small"
          columns={columns}
          dataSource={dataSource}
          loading={loadingTx}
          pagination={false}
          locale={{
            emptyText: <div className={styles.empty}>暂无交易明细</div>,
          }}
          rowClassName={(_, index) => (flashFirstRow && index === 0 ? styles.rowFlash : '')}
        />

        {total > 0 && Math.ceil(total / PAGE_SIZE) > 1 ? (
          <Pagination
            style={{ marginTop: 16, textAlign: 'right' }}
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={onTxPageChange}
            showTotal={(t) => `共 ${t} 条`}
          />
        ) : null}

        <RechargeModal
          open={rechargeOpen}
          onCancel={() => setRechargeOpen(false)}
          groupDisplayName={groupDisplayName}
          onSubmit={handleRechargeSubmit}
        />
      </div>
    );
  }
);

ComputeWallet.displayName = 'ComputeWallet';

export default ComputeWallet;

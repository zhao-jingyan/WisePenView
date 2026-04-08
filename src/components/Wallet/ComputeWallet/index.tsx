/**
 * 通用计算点钱包：/user/wallet；个人无参拉余额，小组传 groupId。
 * 数据请求使用 ahooks（不使用 useEffect）。
 */
import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { usePagination, useRequest, useUnmount } from 'ahooks';
import { Button, Pagination, Skeleton, Table, Tabs } from 'antd';
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiSubtractLine } from 'react-icons/ri';
import { useWalletService } from '@/contexts/ServicesContext';
import { WALLET_TARGET_TYPE, WALLET_TOKEN_TX_TYPE } from '@/constants/wallet';
import type { WalletTransactionKind, WalletTransactionRecord } from '@/types/wallet';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import RechargeModal from '@/components/Wallet/RechargeModal';
import type { ComputeWalletProps, ComputeWalletRef } from './index.type';
import styles from './style.module.less';

type TabKey = 'all' | 'recharge' | 'spend';

const PAGE_SIZE = 20;

const tabToListType = (key: TabKey): number | undefined => {
  if (key === 'recharge') return WALLET_TOKEN_TX_TYPE.REFILL;
  if (key === 'spend') return WALLET_TOKEN_TX_TYPE.SPEND;
  return undefined;
};

const isInflowKind = (k: WalletTransactionKind): boolean => k === 'RECHARGE' || k === 'TRANSFER_IN';

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
  ({ targetType, targetId, canRecharge, groupDisplayName, showOperatorColumn = false }, ref) => {
    const walletService = useWalletService();
    const message = useAppMessage();

    const effectiveGroupId = targetType === WALLET_TARGET_TYPE.GROUP ? (targetId ?? '').trim() : '';
    const walletReady = targetType === WALLET_TARGET_TYPE.USER || Boolean(effectiveGroupId);

    const [displayBalance, setDisplayBalance] = useState(0);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [tab, setTab] = useState<TabKey>('all');
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
        const data = await walletService.getUserWalletInfo(
          targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId
            ? { groupId: effectiveGroupId }
            : undefined
        );
        return { balance: data.balance, options };
      },
      {
        ready: walletReady,
        refreshDeps: [walletService, targetType, effectiveGroupId],
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
        const listType = tabToListType(tab);
        const { total: nextTotal, records } = await walletService.listTransactions({
          groupId:
            targetType === WALLET_TARGET_TYPE.GROUP && effectiveGroupId
              ? effectiveGroupId
              : undefined,
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
        refreshDeps: [walletService, targetType, effectiveGroupId, tab],
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

    const handleTabChange = (key: string) => {
      setTab(key as TabKey);
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
              <div className={styles.summarySub}>{row.subTitle || '—'}</div>
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
                {n}
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

    return (
      <div className={styles.card}>
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
          activeKey={tab}
          onChange={handleTabChange}
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

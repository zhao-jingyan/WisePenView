/**
 * 高级组组长：个人计算点与小组池之间的 Token 划拨（transferTokenBetweenGroupAndUser）。
 */
import React, { useCallback, useState } from 'react';
import { Button, InputNumber, Skeleton } from 'antd';
import { useRequest } from 'ahooks';
import { useWalletService } from '@/contexts/ServicesContext';
import { WALLET_TOKEN_TRANSFER_TYPE } from '@/constants/wallet';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { OwnerGroupTokenTransferProps } from './index.type';
import styles from './style.module.less';

const OwnerGroupTokenTransfer: React.FC<OwnerGroupTokenTransferProps> = ({
  groupId,
  onTransferSuccess,
}) => {
  const walletService = useWalletService();
  const message = useAppMessage();

  const [personalBal, setPersonalBal] = useState(0);
  const [groupBal, setGroupBal] = useState(0);
  const [amtToGroup, setAmtToGroup] = useState<number | null>(null);
  const [amtToOwner, setAmtToOwner] = useState<number | null>(null);

  const { loading: balanceLoading, runAsync: loadBalances } = useRequest(
    async () => {
      const gid = groupId?.trim();
      if (!gid) {
        return null;
      }
      const [personalRes, groupRes] = await Promise.all([
        walletService.getUserWalletInfo(),
        walletService.getUserWalletInfo({ groupId: gid }),
      ]);
      return { personalBal: personalRes.balance, groupBal: groupRes.balance };
    },
    {
      ready: Boolean(groupId?.trim()),
      refreshDeps: [groupId, walletService],
      onSuccess: (res) => {
        if (!res) return;
        setPersonalBal(res.personalBal);
        setGroupBal(res.groupBal);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取余额失败'));
      },
    }
  );

  const refreshAfterTransfer = useCallback(async () => {
    await loadBalances();
    onTransferSuccess?.();
  }, [loadBalances, onTransferSuccess]);

  const { loading: submittingToGroup, runAsync: runTransferToGroup } = useRequest(
    async (amount: number) =>
      walletService.transferTokenBetweenGroupAndUser({
        groupId,
        tokenCount: amount,
        tokenTransferType: WALLET_TOKEN_TRANSFER_TYPE.TO_GROUP,
      }),
    {
      manual: true,
      onSuccess: async () => {
        message.success('已转入小组池');
        setAmtToGroup(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '转入失败'));
      },
    }
  );

  const { loading: submittingToOwner, runAsync: runTransferToOwner } = useRequest(
    async (amount: number) =>
      walletService.transferTokenBetweenGroupAndUser({
        groupId,
        tokenCount: amount,
        tokenTransferType: WALLET_TOKEN_TRANSFER_TYPE.TO_OWNER,
      }),
    {
      manual: true,
      onSuccess: async () => {
        message.success('已转回组长账户');
        setAmtToOwner(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '转回失败'));
      },
    }
  );

  const handleGiveToGroup = async () => {
    const n = amtToGroup;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      message.warning('请输入大于 0 的整数');
      return;
    }
    if (n > personalBal) {
      message.warning('组长个人计算点不足');
      return;
    }
    await runTransferToGroup(Math.floor(n));
  };

  const handleGiveToOwner = async () => {
    const n = amtToOwner;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      message.warning('请输入大于 0 的整数');
      return;
    }
    if (n > groupBal) {
      message.warning('小组池计算点不足');
      return;
    }
    await runTransferToOwner(Math.floor(n));
  };

  if (!groupId?.trim()) {
    return <div className={styles.card}>缺少小组信息</div>;
  }

  return (
    <div className={styles.card}>
      <p className={styles.intro}>
        点卡兑换仅计入组长个人账户。您可将个人账户中的计算点划入小组池，或将小组池余额转回个人账户，便于统一给组员分配使用。
      </p>

      <div className={styles.balanceHeader}>
        <h3 className={styles.balanceTitle}>当前余额</h3>
        <Button onClick={() => void loadBalances()} disabled={balanceLoading}>
          刷新
        </Button>
      </div>
      <div className={styles.balanceRow}>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>组长个人计算点</p>
          {balanceLoading ? (
            <Skeleton.Input active className={styles.balanceSkeleton} size="small" />
          ) : (
            <p className={styles.balanceValue}>
              {personalBal}
              <span className={styles.unit}>点</span>
            </p>
          )}
        </div>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>小组池计算点</p>
          {balanceLoading ? (
            <Skeleton.Input active className={styles.balanceSkeleton} size="small" />
          ) : (
            <p className={styles.balanceValue}>
              {groupBal}
              <span className={styles.unit}>点</span>
            </p>
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>划入小组池</h4>
      <div className={styles.formRow}>
        <InputNumber
          className={styles.amountInput}
          min={1}
          max={personalBal > 0 ? personalBal : undefined}
          precision={0}
          placeholder="数量"
          value={amtToGroup ?? undefined}
          onChange={(v) => setAmtToGroup(typeof v === 'number' ? v : null)}
          disabled={submittingToGroup || balanceLoading}
        />
        <Button
          type="primary"
          loading={submittingToGroup}
          disabled={balanceLoading}
          onClick={() => void handleGiveToGroup()}
        >
          确认转入小组
        </Button>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>从小组池转回组长</h4>
      <div className={styles.formRow}>
        <InputNumber
          className={styles.amountInput}
          min={1}
          max={groupBal > 0 ? groupBal : undefined}
          precision={0}
          placeholder="数量"
          value={amtToOwner ?? undefined}
          onChange={(v) => setAmtToOwner(typeof v === 'number' ? v : null)}
          disabled={submittingToOwner || balanceLoading}
        />
        <Button
          type="primary"
          loading={submittingToOwner}
          disabled={balanceLoading}
          onClick={() => void handleGiveToOwner()}
        >
          确认转回组长
        </Button>
      </div>
    </div>
  );
};

export default OwnerGroupTokenTransfer;

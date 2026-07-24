/**
 * 个人中心「余额与使用量」（左下角入口）：展示个人钱包和各小组配额。
 * 两个区块直接铺在页面中，视觉边界由表格自身提供。
 */
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import ComputeWallet from '@/views/app/_common/Wallet/ComputeWallet';
import QuotaByGroup from '../_components/QuotaByGroup';
import layout from '../style.module.less';

function Usage() {
  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>余额与使用量</h1>
        <span className={layout.pageSubtitle}>
          查看个人计算点余额、点卡充值记录，以及在各小组中的配额使用情况
        </span>
      </div>
      <div className={layout.usageContent}>
        <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} canRecharge surface="plain" />
        <QuotaByGroup
          pagination={{
            defaultPageSize: 10,
          }}
        />
      </div>
    </div>
  );
}

export default Usage;

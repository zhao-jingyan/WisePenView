import type { WalletTargetType } from '@/constants/wallet';

export interface ComputeWalletRef {
  /** 显式刷新余额与当前页流水 */
  refresh: () => Promise<void>;
}

/**
 * 通用钱包组件 Props（个人中心 + 高级组 token明细 复用同一套 UI）。
 */
export interface ComputeWalletProps {
  /** 资金主体：USER 个人 / GROUP 小组 */
  targetType: WalletTargetType;

  /**
   * 小组为 groupId（string，防大数精度丢失），用于 getUserWalletInfo / listTransactions 的 query。
   * USER 场景可不传 groupId（接口查当前用户）。
   */
  targetId?: string;
  /**
   * 是否展示「充值」入口（POST /user/wallet/redeemVoucher 仅给本人兑换）。
   * 个人中心为 true；小组 token 明细应为 false。
   */
  canRecharge: boolean;
  /** 小组充值弹窗标题：为「为「xxx」充值」；个人不传则弹窗为「个人充值」 */
  groupDisplayName?: string;
  /**
   * 是否在表格增加「操作人」列。
   * 小组组长查看组账户流水时打开，用于展示充值人/消费人；个人钱包一般关闭。
   */
  showOperatorColumn?: boolean;
}

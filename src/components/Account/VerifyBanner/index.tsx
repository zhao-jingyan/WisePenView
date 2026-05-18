import { Alert, Button } from 'antd';
import type { VerifyBannerProps } from './index.type';
import styles from './style.module.less';

function VerifyBanner({ visible, onGoVerify }: VerifyBannerProps) {
  if (!visible) return null;
  return (
    <Alert
      type="warning"
      description="请通过邮箱验证或复旦 UIS 认证完成账号验证，否则部分功能可能无法正常使用。"
      showIcon
      action={
        <Button size="small" type="link" onClick={onGoVerify}>
          去验证
        </Button>
      }
      className={styles.statusBanner}
    />
  );
}

export default VerifyBanner;

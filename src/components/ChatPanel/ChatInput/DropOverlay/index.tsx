import type { DropOverlayProps } from './index.type';
import styles from '../style.module.less';

function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;

  return <div className={styles.dropOverlay}>松开即可添加附件</div>;
}

export default DropOverlay;

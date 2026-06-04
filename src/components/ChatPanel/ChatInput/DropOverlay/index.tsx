import styles from '../style.module.less';
import type { DropOverlayProps } from './index.type';

function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;
  return (
    <div className={styles.dropOverlay}>
      <span>释放以添加文件</span>
    </div>
  );
}

export default DropOverlay;

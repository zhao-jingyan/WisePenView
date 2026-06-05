import { Avatar } from '@heroui/react';
import type { TableMemberCellProps } from './index.type';
import styles from './style.module.less';

function TableMemberCell({ name, subline, avatarSrc }: TableMemberCellProps) {
  const displayName = name.trim() || '?';
  const avatarText = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.memberCell}>
      <Avatar aria-label={displayName} className={styles.avatar}>
        {avatarSrc ? <Avatar.Image alt={displayName} src={avatarSrc} /> : null}
        <Avatar.Fallback>{avatarText}</Avatar.Fallback>
      </Avatar>
      <div className={styles.meta}>
        <span className={styles.name}>{displayName}</span>
        {subline ? <span className={styles.subline}>{subline}</span> : null}
      </div>
    </div>
  );
}

export default TableMemberCell;

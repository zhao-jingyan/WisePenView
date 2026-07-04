import { Avatar, ListBox, ListBoxItem } from '@heroui/react';
import { useMemo } from 'react';
import type { SelectedMemberListProps } from './index.type';
import styles from './style.module.less';

function SelectedMemberList({ members, isReadOnly = true }: SelectedMemberListProps) {
  const disabledKeys = useMemo(
    () => (isReadOnly ? members.map((member) => member.userId) : []),
    [members, isReadOnly]
  );

  if (!members.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>选中成员 ({members.length} 人)</div>
      <ListBox
        aria-label="选中成员"
        selectionMode="none"
        disabledKeys={disabledKeys}
        className={styles.list}
      >
        {members.map((member) => {
          const displayName = member.displayName;
          const avatarText = displayName.charAt(0).toUpperCase();

          return (
            <ListBoxItem
              key={member.userId}
              id={member.userId}
              textValue={displayName}
              isDisabled={isReadOnly}
              className={`${styles.memberItem} ${isReadOnly ? styles.memberItemReadOnly : ''}`}
            >
              <div className={styles.memberContent}>
                <Avatar aria-label={displayName} className={styles.avatar}>
                  {member.avatarSrc && <Avatar.Image alt={displayName} src={member.avatarSrc} />}
                  <Avatar.Fallback className={styles.avatarFallback}>{avatarText}</Avatar.Fallback>
                </Avatar>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{displayName}</span>
                  <span className={styles.memberDescription}>{member.roleLabel}</span>
                </div>
              </div>
            </ListBoxItem>
          );
        })}
      </ListBox>
    </div>
  );
}

export default SelectedMemberList;

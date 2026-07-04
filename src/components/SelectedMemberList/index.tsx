import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import { Avatar, ListBox, ListBoxItem } from '@heroui/react';
import { useMemo } from 'react';
import type { SelectedMemberListProps } from './index.type';
import styles from './style.module.less';

const EMPTY_MEMBERS: GroupMember[] = [];

const getRoleDisplayLabel = (role: GroupMember['role']): string => {
  // 角色枚举未来扩展时，列表先展示原 key，避免空白。
  return ROLE.keyLabels[role] || role;
};

function SelectedMemberList({ members, isReadOnly = true }: SelectedMemberListProps) {
  const formatDescription = (member: GroupMember) => {
    const parts = [];
    if (member.nickname) parts.push(member.nickname);
    if (member.role) parts.push(getRoleDisplayLabel(member.role));
    return parts.join(' ') || undefined;
  };

  const dataSource = useMemo(() => members || EMPTY_MEMBERS, [members]);
  const disabledKeys = useMemo(
    () => (isReadOnly ? dataSource.map((member) => member.userId) : []),
    [dataSource, isReadOnly]
  );

  if (!dataSource.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>选中成员 ({dataSource.length} 人)</div>
      <ListBox
        aria-label="选中成员"
        selectionMode="none"
        disabledKeys={disabledKeys}
        className={styles.list}
      >
        {dataSource.map((member) => {
          const displayName = member.realname || member.nickname || '成员';
          const avatarText = displayName.charAt(0).toUpperCase();
          const description = formatDescription(member);

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
                  {member.avatar && <Avatar.Image alt={displayName} src={member.avatar} />}
                  <Avatar.Fallback className={styles.avatarFallback}>{avatarText}</Avatar.Fallback>
                </Avatar>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{displayName}</span>
                  {description && <span className={styles.memberDescription}>{description}</span>}
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

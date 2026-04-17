import React from 'react';
import { Button } from 'antd';
import { AiOutlineDelete } from 'react-icons/ai';
import { RiMoneyDollarCircleLine, RiUserLine } from 'react-icons/ri';
import type { MemberListToolbarProps } from './index.type';
import styles from './style.module.less';

const MemberListToolbar: React.FC<MemberListToolbarProps> = ({
  isEditMode,
  total,
  groupDisplayConfig,
  selectedCount,
  onModifyPermission,
  onAssignQuota,
  onDelete,
  onToggleEditMode,
  onInviteUser,
}) => {
  if (isEditMode) {
    return (
      <div className={styles.toolbarEdit}>
        <div className={styles.toolbarEditContent}>
          <div className={styles.toolbarEditContentLeft}>
            {groupDisplayConfig.canModifyPermission && (
              <Button
                icon={<RiUserLine />}
                onClick={onModifyPermission}
                disabled={selectedCount === 0}
              >
                修改权限
              </Button>
            )}
            {groupDisplayConfig.canAssignQuota && (
              <Button
                icon={<RiMoneyDollarCircleLine />}
                onClick={onAssignQuota}
                disabled={selectedCount === 0}
              >
                分配配额
              </Button>
            )}
            {groupDisplayConfig.canRemoveMember && (
              <Button
                danger
                icon={<AiOutlineDelete />}
                onClick={onDelete}
                disabled={selectedCount === 0}
              >
                删除成员
              </Button>
            )}
          </div>
          <Button onClick={onToggleEditMode}>取消编辑</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.toolbarDefault}>
      <span className={styles.toolbarDefaultText}>共 {total} 人</span>
      <div className={styles.toolbarDefaultButtons}>
        {groupDisplayConfig.canEnterEditMode && (
          <Button onClick={onToggleEditMode}>管理用户</Button>
        )}
        {groupDisplayConfig.canInviteMember && (
          <Button type="primary" onClick={onInviteUser}>
            邀请用户
          </Button>
        )}
      </div>
    </div>
  );
};

export default MemberListToolbar;

import React from 'react';
import { Avatar } from 'antd';

import type { UserCapsuleProps } from './index.type';
import styles from './style.module.less';

const AVATAR_SIZE = 20;

const UserCapsule: React.FC<UserCapsuleProps> = ({ name, avatar, variant = 'bare' }) => {
  const displayName = name.trim() || '-';
  const avatarText = displayName === '-' ? '?' : displayName.charAt(0).toUpperCase();

  return (
    <span className={`${styles.userCapsule} ${styles[variant]}`}>
      <Avatar size={AVATAR_SIZE} src={avatar} alt={displayName} className={styles.avatar}>
        {avatarText}
      </Avatar>
      <span className={styles.name}>{displayName}</span>
    </span>
  );
};

export default UserCapsule;

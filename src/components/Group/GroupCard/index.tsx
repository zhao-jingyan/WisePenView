import React from 'react';
import { Card, Image, Badge } from 'antd';
import styles from './style.module.less';
import type { GroupCardProps } from './index.type';
import { PLACEHOLDER_IMAGE } from '@/utils/image';
import { GROUP_TYPE, getGroupTypeLabel } from '@/constants/group';
import UserCapsule from '@/components/Common/UserCapsule';

const { Meta } = Card;

const GroupCard: React.FC<GroupCardProps> = ({ group, onClick }) => {
  const {
    groupName,
    ownerInfo,
    groupCoverUrl: cover,
    memberCount = 0,
    groupType = GROUP_TYPE.NORMAL,
  } = group;

  const handleCardClick = () => {
    onClick?.(group);
  };

  const ownerName = ownerInfo?.nickname ?? '';

  const cardContent = (
    <Card
      hoverable
      onClick={handleCardClick}
      className={styles.card}
      cover={
        <div className={styles.cover}>
          <Image
            src={cover || PLACEHOLDER_IMAGE}
            alt={groupName}
            preview={false}
            fallback={PLACEHOLDER_IMAGE}
            className={styles.image}
          />
        </div>
      }
    >
      <Meta
        title={groupName}
        description={
          <div className={styles.metaDescription}>
            {ownerInfo && <UserCapsule name={ownerName} avatar={ownerInfo.avatar} />}
            <span className={styles.memberCount}>{memberCount} 成员</span>
          </div>
        }
      />
    </Card>
  );

  if (groupType === GROUP_TYPE.ADVANCED) {
    return (
      <Badge.Ribbon text={getGroupTypeLabel(groupType)} color="#faad14">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  if (groupType === GROUP_TYPE.PUBLIC) {
    return (
      <Badge.Ribbon text={getGroupTypeLabel(groupType)} color="#722ed1">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  return cardContent;
};

export default GroupCard;

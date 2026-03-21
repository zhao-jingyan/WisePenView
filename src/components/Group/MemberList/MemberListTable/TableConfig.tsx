import React from 'react';
import { Avatar, Badge } from 'antd';
import type { TableColumnsType } from 'antd';
import type { GroupMember } from '@/types/group';
import type { PermissionConfig } from '../PermissionConfig';
import QuotaBar from '@/components/Common/QuotaBar';
import type { GroupMemberRole } from '@/constants/group';
import { ROLE_LABEL, ROLE_MAP } from '@/constants/group';

type MemberRecord = GroupMember & { key: React.Key };

const getBadgeColor = (role: GroupMemberRole): string => {
  switch (role) {
    case 'OWNER':
      return 'gold';
    case 'ADMIN':
      return 'blue';
    case 'MEMBER':
      return 'gray';
    default:
      return '';
  }
};

export const getColumns = (
  permissionConfig: PermissionConfig,
  styles: Record<string, string>
): TableColumnsType<MemberRecord> => {
  const columns: TableColumnsType<MemberRecord> = [
    {
      key: 'badge',
      title: '',
      dataIndex: 'role',
      width: 64,
      align: 'center',
      render: (role: GroupMemberRole) => (
        <Badge color={getBadgeColor(role)} className={styles.badgeItem} />
      ),
    },
    {
      key: 'avatar',
      title: '头像',
      dataIndex: 'avatar',
      width: 80,
      render: (avatar: string, record: MemberRecord) => (
        <Avatar src={avatar} alt={record.nickname || record.realname || '?'} />
      ),
    },
    {
      key: 'realname',
      title: '姓名',
      dataIndex: 'realname',
      width: 100,
      render: (realname: string) => <span className={styles.nameItem}>{realname}</span>,
      sorter: (a, b) => (a.realname || '').localeCompare(b.realname || '', 'zh-CN'),
    },
    {
      key: 'nickname',
      title: '昵称',
      dataIndex: 'nickname',
      width: 100,
      render: (nickname: string) => <span className={styles.nicknameItem}>{nickname ?? ''}</span>,
      sorter: (a, b) => (a.nickname ?? '').localeCompare(b.nickname ?? '', 'zh-CN'),
    },
    {
      key: 'role',
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role: GroupMemberRole) => (
        <span className={styles.roleItem}>{ROLE_LABEL[role] ?? role}</span>
      ),
      sorter: (a, b) => (ROLE_MAP[a.role] ?? 0) - (ROLE_MAP[b.role] ?? 0),
    },
    {
      key: 'joinTime',
      title: '加入时间',
      dataIndex: 'joinTime',
      width: 150,
      render: (joinTime: string) => <span className={styles.joinTimeItem}>{joinTime}</span>,
      sorter: (a, b) =>
        (a.joinTime ? new Date(a.joinTime).getTime() : 0) -
        (b.joinTime ? new Date(b.joinTime).getTime() : 0),
    },
    {
      key: 'quota',
      title: '配额使用',
      dataIndex: 'used',
      align: 'center',
      width: 300,
      render: (_: number, record: MemberRecord) => (
        <div className={styles.quotaItem}>
          <QuotaBar used={record.used ?? 0} limit={record.limit ?? 0} />
        </div>
      ),
      sorter: (a, b) => (a.used ?? 0) - (b.used ?? 0),
    },
  ];

  const filteredColumns = columns.filter((col) => {
    if (col.key === 'realname' && !permissionConfig.showRealName) return false;
    if (col.key === 'quota' && !permissionConfig.showQuotas) return false;
    return true;
  });

  if (filteredColumns.length > 0) {
    const lastIndex = filteredColumns.length - 1;
    filteredColumns[lastIndex] = {
      ...filteredColumns[lastIndex],
      width: undefined,
      ellipsis: true,
    };
  }

  return filteredColumns;
};

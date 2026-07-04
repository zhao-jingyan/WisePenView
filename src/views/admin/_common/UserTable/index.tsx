import { DataTable, type DataTableColumn } from '@/components/Table';
import type { AdminUser } from '@/domains/Admin';
import { Chip, ListBox, Select } from '@heroui/react';
import { useCallback, useMemo, type ReactNode } from 'react';
import type { AdminUserTableProps } from './index.type';
import styles from './style.module.less';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function AdminUserTable({
  users,
  loading = false,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onRowClick,
}: AdminUserTableProps) {
  const renderRowButton = useCallback(
    (record: AdminUser, children: ReactNode) => (
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => onRowClick(record.id)}
        aria-label={`查看用户 ${record.displayName}`}
      >
        {children}
      </button>
    ),
    [onRowClick]
  );

  const columns = useMemo<DataTableColumn<AdminUser>[]>(
    () => [
      {
        id: 'user',
        label: '用户',
        width: 'lg',
        isRowHeader: true,
        renderCell: (record) =>
          renderRowButton(
            record,
            <DataTable.MemberCell
              name={record.displayName}
              subline={record.nicknameText}
              avatarSrc={record.avatarSrc}
            />
          ),
      },
      {
        id: 'username',
        label: '用户名',
        width: 'md',
        renderCell: (record) =>
          renderRowButton(record, <DataTable.TextCell>{record.usernameText}</DataTable.TextCell>),
      },
      {
        id: 'campusNo',
        label: '学工号',
        width: 'md',
        renderCell: (record) =>
          renderRowButton(record, <DataTable.TextCell>{record.campusNoText}</DataTable.TextCell>),
      },
      {
        id: 'identityType',
        label: '身份',
        width: 'sm',
        renderCell: (record) =>
          renderRowButton(
            record,
            <Chip size="sm" variant="soft">
              <Chip.Label>{record.identityTypeLabel}</Chip.Label>
            </Chip>
          ),
      },
      {
        id: 'status',
        label: '状态',
        width: 'sm',
        renderCell: (record) => {
          const statusClassName =
            record.status === 1
              ? styles.statusSuccess
              : record.status === -2
                ? styles.statusDanger
                : styles.statusWarning;
          return renderRowButton(
            record,
            <Chip size="sm" variant="soft" className={statusClassName}>
              <Chip.Label>{record.statusLabel}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'email',
        label: '邮箱',
        width: 'lg',
        renderCell: (record) =>
          renderRowButton(record, <DataTable.TextCell>{record.emailText}</DataTable.TextCell>),
      },
      {
        id: 'createTime',
        label: '创建时间',
        width: 'lg',
        renderCell: (record) =>
          renderRowButton(record, <DataTable.TextCell>{record.createTimeText}</DataTable.TextCell>),
      },
    ],
    [renderRowButton]
  );

  return (
    <div className={styles.tableWrapper}>
      <DataTable<AdminUser>
        ariaLabel="用户列表"
        rowKey="id"
        items={users}
        loading={loading}
        columns={columns}
        emptyText="暂无用户"
        getRowClassName={() => styles.clickableRow}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          summary: `共 ${total} 条`,
          onChange: onPageChange,
          pageSizeControl: (
            <Select
              aria-label="每页数量"
              value={String(pageSize)}
              onChange={(key) => {
                if (key == null || Array.isArray(key)) return;
                onPageChange(1, Number(key));
              }}
              className={styles.pageSizeSelect}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <ListBox.Item key={String(size)} id={String(size)} textValue={`${size} 条/页`}>
                      {size} 条/页
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ),
        }}
        maxBodyHeight={520}
      />
    </div>
  );
}

export default AdminUserTable;

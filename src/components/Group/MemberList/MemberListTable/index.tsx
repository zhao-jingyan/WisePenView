import type { GroupMember } from '@/domains/Group';
import type { TablePaginationConfig, TableProps } from 'antd';
import { Table } from 'antd';
import React, { useMemo, useRef } from 'react';
import type { MemberListPaginationConfig, MemberListTableProps } from './index.type';
import styles from './style.module.less';
import { getColumns } from './TableConfig';

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection'];

function MemberListTable({
  groupDisplayConfig,
  pagination,
  members,
  loading,
  total,
  currentPage,
  pageSize,
  isEditMode,
  selectedRowKeys,
  onPageChange,
  onSelectedRowKeysChange,
  onSelectedMembersChange,
}: MemberListTableProps) {
  const paginationConfig: Required<MemberListPaginationConfig> = {
    defaultPageSize: pagination?.defaultPageSize ?? 5,
    pageSizeOptions: pagination?.pageSizeOptions ?? [5, 10, 20, 50],
    showSizeChanger: pagination?.showSizeChanger ?? true,
  };
  const selectedMembersMapRef = useRef<Map<string, GroupMember>>(new Map());

  const dataSource = useMemo(
    () =>
      members.map((member) => ({
        ...member,
        key: member.userId,
      })),
    [members]
  );

  const columns = useMemo(() => getColumns(groupDisplayConfig, styles), [groupDisplayConfig]);

  const rowSelection: TableRowSelection<GroupMember & { key: React.Key }> = useMemo(() => {
    if (!isEditMode) return undefined;

    const emitSelectedMembersChange = (keys: Array<string | number>) => {
      if (!onSelectedMembersChange) return;
      const selectedMembers = keys
        .map((key) => selectedMembersMapRef.current.get(String(key)))
        .filter((member): member is GroupMember => member !== undefined);
      onSelectedMembersChange(selectedMembers);
    };

    const currentPageKeysSet = new Set(dataSource.map((item) => String(item.key)));

    return {
      selectedRowKeys: selectedRowKeys.filter((key) => currentPageKeysSet.has(String(key))),
      onChange: (newSelectedRowKeys: React.Key[]) => {
        const validNewKeys: (string | number)[] = newSelectedRowKeys.filter(
          (key): key is string | number => typeof key === 'string' || typeof key === 'number'
        );

        const otherPageKeys = selectedRowKeys.filter((key) => !currentPageKeysSet.has(String(key)));
        const finalSelectedKeys = [...otherPageKeys, ...validNewKeys];
        onSelectedRowKeysChange(finalSelectedKeys);

        validNewKeys.forEach((key) => {
          const idKey = String(key);
          const member = members.find((m) => String(m.userId) === idKey);
          if (member) selectedMembersMapRef.current.set(idKey, member);
        });

        const validNewKeysSet = new Set(validNewKeys.map((k) => String(k)));
        const previousCurrentPageKeys = selectedRowKeys.filter((key) =>
          currentPageKeysSet.has(String(key))
        );
        previousCurrentPageKeys.forEach((key) => {
          if (!validNewKeysSet.has(String(key))) {
            selectedMembersMapRef.current.delete(String(key));
          }
        });

        emitSelectedMembersChange(finalSelectedKeys);
      },
    };
  }, [
    isEditMode,
    selectedRowKeys,
    dataSource,
    members,
    onSelectedRowKeysChange,
    onSelectedMembersChange,
  ]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    _sorter: unknown
  ) => {
    let newPage = currentPage;
    let newPageSize = pageSize;
    let pageChanged = false;

    if (pagination.current !== undefined && pagination.current !== currentPage) {
      newPage = pagination.current;
      pageChanged = true;
    }

    if (pagination.pageSize !== undefined && pagination.pageSize !== pageSize) {
      newPageSize = pagination.pageSize;
      if (pagination.current === undefined) {
        newPage = 1;
      }
      pageChanged = true;
    }

    if (pageChanged) {
      onPageChange(newPage, newPageSize);
    }
  };

  return (
    <Table<GroupMember & { key: React.Key }>
      rowSelection={rowSelection}
      columns={columns}
      dataSource={dataSource}
      className={styles.tableWrapper}
      onChange={handleTableChange}
      loading={loading}
      pagination={{
        size: 'small',
        current: currentPage,
        pageSize,
        total,
        pageSizeOptions: paginationConfig.pageSizeOptions,
        showSizeChanger: paginationConfig.showSizeChanger,
        showTotal: (tableTotal) => `共 ${tableTotal} 人`,
      }}
    />
  );
}

export default MemberListTable;

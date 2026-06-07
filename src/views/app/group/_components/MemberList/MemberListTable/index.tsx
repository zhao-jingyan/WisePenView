import QuotaBar from '@/components/Common/QuotaBar';
import {
  DataTable,
  ManageTable,
  type DataTableColumn,
  type ManageTableColumn,
} from '@/components/Table';
import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { Input, Label, ListBox, Select, TextField } from '@heroui/react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { canEditSelectedMembers, canEditSelectedMembersForQuota } from '../../GroupDisplayConfig';
import type {
  MemberListInlineDraft,
  MemberListPaginationConfig,
  MemberListTableProps,
} from './index.type';
import styles from './style.module.less';

type MemberRecord = GroupMember & { key: string };
type ReadonlyColumn = DataTableColumn<MemberRecord>;
type EditableColumn = ManageTableColumn<MemberRecord>;

const EMPTY_TEXT = '-';
const GROUP_MEMBER_TOKEN_LIMIT_MAX = 100_000_000;

function getDisplayName(member: GroupMember): string {
  return member.nickname?.trim() || member.realname?.trim() || '?';
}

function getMemberSubline(member: GroupMember, showRealName: boolean): string | undefined {
  if (!showRealName) {
    return undefined;
  }
  const realname = member.realname?.trim();
  if (!realname || realname === getDisplayName(member)) {
    return undefined;
  }
  return realname;
}

function getRoleClassName(role: GroupMember['role']): string {
  switch (role) {
    case 'OWNER':
      return styles.roleOwner;
    case 'ADMIN':
      return styles.roleAdmin;
    case 'MEMBER':
    default:
      return styles.roleMember;
  }
}

function canEditRole(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canModifyPermission &&
    canEditSelectedMembers([member], props.groupDisplayConfig.editableRoles)
  );
}

function canEditQuota(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canAssignQuota &&
    props.groupDisplayConfig.showQuotas &&
    canEditSelectedMembersForQuota([member], props.groupDisplayConfig.editableRolesForQuota)
  );
}

function canRemoveMember(member: GroupMember, props: MemberListTableProps): boolean {
  return (
    props.groupDisplayConfig.canRemoveMember &&
    canEditSelectedMembers([member], props.groupDisplayConfig.editableRoles)
  );
}

function buildPageSizeControl(
  config: Required<MemberListPaginationConfig>,
  currentPage: number,
  pageSize: number,
  onPageChange: (page: number, size: number) => void
): ReactNode {
  if (!config.showSizeChanger) {
    return null;
  }

  return (
    <Select
      aria-label="每页成员数"
      value={String(pageSize)}
      onChange={(value) => {
        if (value == null || Array.isArray(value)) {
          return;
        }
        onPageChange(1, Number(value));
      }}
      className={styles.pageSizeSelect}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className={ManageTable.selectPopover}>
        <ListBox>
          {config.pageSizeOptions.map((value) => (
            <ListBox.Item key={String(value)} id={String(value)} textValue={`${value} 条/页`}>
              {value} 条/页
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function renderRole(role: GroupMember['role']) {
  return (
    <span className={`${styles.roleBadge} ${getRoleClassName(role)}`}>
      {ROLE.keyLabels[role] ?? role}
    </span>
  );
}

function renderQuota(member: GroupMember) {
  return (
    <div className={styles.quotaItem}>
      <QuotaBar used={member.used ?? 0} limit={member.limit ?? 0} />
    </div>
  );
}

function renderRoleEditor(
  member: GroupMember,
  inlineDraft: MemberListInlineDraft,
  onInlineDraftChange: (draft: MemberListInlineDraft) => void,
  canPromoteToAdmin: boolean
) {
  const value = inlineDraft.role ?? member.role;

  return (
    <Select
      aria-label="成员角色"
      value={value}
      onChange={(nextValue) => {
        if (nextValue == null || Array.isArray(nextValue)) {
          return;
        }
        onInlineDraftChange({ role: nextValue as GroupMember['role'] });
      }}
      className={styles.inlineSelect}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className={ManageTable.selectPopover}>
        <ListBox>
          {canPromoteToAdmin ? (
            <ListBox.Item key="ADMIN" id="ADMIN" textValue="管理员">
              管理员
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ) : null}
          <ListBox.Item key="MEMBER" id="MEMBER" textValue="成员">
            成员
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function renderQuotaEditor(
  member: GroupMember,
  inlineDraft: MemberListInlineDraft,
  onInlineDraftChange: (draft: MemberListInlineDraft) => void
) {
  const min = Math.max(1, member.used ?? 0);
  const value = inlineDraft.quota ?? String(member.limit ?? min);

  return (
    <TextField
      aria-label="成员配额"
      value={value}
      onChange={(nextValue) => onInlineDraftChange({ quota: nextValue })}
      className={styles.inlineNumberField}
    >
      <Label className={styles.inlineFieldLabel}>配额</Label>
      <Input
        type="number"
        min={min}
        max={GROUP_MEMBER_TOKEN_LIMIT_MAX}
        step={1}
        placeholder="请输入整数"
      />
    </TextField>
  );
}

function buildReadonlyColumns(props: MemberListTableProps): ReadonlyColumn[] {
  const columns: ReadonlyColumn[] = [
    {
      id: 'member',
      label: '成员',
      width: 'lg',
      align: 'start',
      isRowHeader: true,
      renderCell: (member) => (
        <DataTable.MemberCell
          name={getDisplayName(member)}
          subline={getMemberSubline(member, props.groupDisplayConfig.showRealName)}
          avatarSrc={member.avatar?.trim() || undefined}
        />
      ),
    },
  ];

  columns.push(
    {
      id: 'role',
      label: '角色',
      width: 'sm',
      align: 'center',
      renderCell: (member) => renderRole(member.role),
    },
    {
      id: 'joinTime',
      label: '加入时间',
      width: 'md',
      align: 'start',
      renderCell: (member) => (
        <DataTable.TextCell>
          {formatTimestampToDate(member.joinTime) || EMPTY_TEXT}
        </DataTable.TextCell>
      ),
    }
  );

  if (props.groupDisplayConfig.showQuotas) {
    columns.push({
      id: 'quota',
      label: '配额使用',
      width: 'lg',
      align: 'center',
      renderCell: renderQuota,
    });
  }

  return columns;
}

function buildEditableColumns(props: MemberListTableProps): EditableColumn[] {
  const readonlyColumns = buildReadonlyColumns(props);

  return readonlyColumns.map((column): EditableColumn => {
    if (column.id === 'member') {
      return {
        ...column,
        width: 'fill',
        renderCell: column.renderCell,
      };
    }

    if (column.id === 'role') {
      return {
        ...column,
        width: 'enum',
        renderCell: column.renderCell,
        renderEditCell: (member) =>
          props.editingKind === 'role'
            ? renderRoleEditor(
                member,
                props.inlineDraft,
                props.onInlineDraftChange,
                props.groupDisplayConfig.canModifyPermission
              )
            : column.renderCell(member, { row: member, rowId: member.key }),
      };
    }

    if (column.id === 'quota') {
      return {
        ...column,
        width: 'lg',
        renderCell: column.renderCell,
        renderEditCell: (member) =>
          props.editingKind === 'quota'
            ? renderQuotaEditor(member, props.inlineDraft, props.onInlineDraftChange)
            : column.renderCell(member, { row: member, rowId: member.key }),
      };
    }

    return {
      ...column,
      renderCell: column.renderCell,
    };
  });
}

function MemberListTable(props: MemberListTableProps) {
  const {
    pagination,
    members,
    loading,
    total,
    currentPage,
    pageSize,
    selectedKeys,
    disabledSelectionKeys,
    editingRowId,
    savingRowId,
    errorRowId,
    errorMessage,
    onPageChange,
    onSelectionChange,
    onStartInlineEdit,
    onInlineSave,
    onInlineCancel,
    onDismissInlineError,
    onDeleteMember,
    toolbar,
  } = props;

  const paginationConfig: Required<MemberListPaginationConfig> = {
    defaultPageSize: pagination?.defaultPageSize ?? 5,
    pageSizeOptions: pagination?.pageSizeOptions ?? [5, 10, 20, 50],
    showSizeChanger: pagination?.showSizeChanger ?? true,
  };

  const dataSource = useMemo<MemberRecord[]>(
    () =>
      members.map((member) => ({
        ...member,
        key: member.userId,
      })),
    [members]
  );

  const pageSizeControl = buildPageSizeControl(
    paginationConfig,
    currentPage,
    pageSize,
    onPageChange
  );

  if (!props.groupDisplayConfig.canEnterEditMode) {
    return (
      <DataTable
        ariaLabel="小组成员列表"
        items={dataSource}
        rowKey="key"
        columns={buildReadonlyColumns(props)}
        loading={loading}
        emptyText="暂无成员"
        toolbar={toolbar}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          onChange: onPageChange,
          summary: total > 0 ? `共 ${total} 人` : '共 0 人',
          pageSizeControl,
        }}
      />
    );
  }

  return (
    <ManageTable
      ariaLabel="小组成员管理"
      items={dataSource}
      rowKey="key"
      columns={buildEditableColumns(props)}
      loading={loading}
      emptyText="暂无成员"
      toolbar={toolbar}
      batchSelection={{
        selectedKeys,
        disabledKeys: disabledSelectionKeys,
        onSelectionChange: (keys) => onSelectionChange(keys, dataSource),
      }}
      inlineEdit={{
        editingRowId,
        savingRowId,
        errorRowId,
        errorMessage,
        onDismissError: onDismissInlineError,
        onSave: onInlineSave,
        onCancel: onInlineCancel,
      }}
      rowActions={(member) => [
        {
          key: 'editRole',
          label: '修改权限',
          visible: props.groupDisplayConfig.canModifyPermission,
          disabled: !canEditRole(member, props),
          onPress: () => onStartInlineEdit(member, 'role'),
        },
        {
          key: 'editQuota',
          label: '分配配额',
          visible: props.groupDisplayConfig.canAssignQuota && props.groupDisplayConfig.showQuotas,
          disabled: !canEditQuota(member, props),
          onPress: () => onStartInlineEdit(member, 'quota'),
        },
        {
          key: 'deleteMember',
          label: '删除成员',
          variant: 'danger',
          visible: props.groupDisplayConfig.canRemoveMember,
          disabled: !canRemoveMember(member, props),
          onPress: () => onDeleteMember(member),
        },
      ]}
      pagination={{
        total,
        current: currentPage,
        pageSize,
        onChange: onPageChange,
        summary: total > 0 ? `共 ${total} 人` : '共 0 人',
        pageSizeControl,
      }}
    />
  );
}

export default MemberListTable;

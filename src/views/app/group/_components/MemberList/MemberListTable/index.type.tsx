import type { GroupMember } from '@/domains/Group';
import type { GroupDisplayConfig } from '../../GroupDisplayConfig';

export interface MemberListPaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
}

export interface MemberListTableProps {
  groupDisplayConfig: GroupDisplayConfig;
  pagination?: MemberListPaginationConfig;
  members: GroupMember[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  isEditMode: boolean;
  selectedRowKeys: (string | number)[];
  onPageChange: (page: number, size: number) => void;
  onSelectedRowKeysChange: (keys: (string | number)[]) => void;
  onSelectedMembersChange?: (members: GroupMember[]) => void;
}

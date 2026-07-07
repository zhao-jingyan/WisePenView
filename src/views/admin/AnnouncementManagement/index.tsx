import { DataTable,type DataTableColumn } from '@/components/Table';
import { useUserService } from '@/domains';
import type { AdminMessage } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import { Button,Chip,ListBox,Select,toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo,useState } from 'react';
import styles from '../style.module.less';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import pageStyles from './style.module.less';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_TEXT = '-';

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  SYSTEM: '系统消息',
  NORMAL: '普通消息',
  GROUP: '小组消息',
};

const DELIVERY_SCOPE_LABEL: Record<string, string> = {
  DIRECT: '定向投递',
  ALL_USERS: '全员消息',
};

const formatOptionalText = (value?: string | number | null): string => {
  if (value == null) return EMPTY_TEXT;
  const text = String(value).trim();
  return text ? text : EMPTY_TEXT;
};

const formatDateTime = (value?: string | null): string => {
  const formatted = formatTimestampToDateTime(value);
  return formatted || EMPTY_TEXT;
};

function AnnouncementManagement() {
  const page = ADMIN_PAGE_CONFIGS.announcements;
  const userService = useUserService();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data, loading, refresh } = useRequest(
    () => userService.listAdminMessages({ page: currentPage, size: pageSize }),
    {
      refreshDeps: [userService, currentPage, pageSize],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const columns = useMemo<DataTableColumn<AdminMessage>[]>(
    () => [
      {
        id: 'title',
        label: '标题',
        width: 'lg',
        isRowHeader: true,
        align: 'start',
        renderCell: (record) => (
          <DataTable.TextCell emphasis title={formatOptionalText(record.title)}>
            {formatOptionalText(record.title)}
          </DataTable.TextCell>
        ),
      },
      {
        id: 'messageType',
        label: '类型',
        width: 'sm',
        renderCell: (record) => {
          const type = formatOptionalText(record.messageType);
          return (
            <Chip size="sm" variant="soft">
              <Chip.Label>{MESSAGE_TYPE_LABEL[type] ?? type}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'deliveryScope',
        label: '范围',
        width: 'sm',
        renderCell: (record) => {
          const scope = formatOptionalText(record.deliveryScope);
          return (
            <Chip size="sm" variant="soft">
              <Chip.Label>{DELIVERY_SCOPE_LABEL[scope] ?? scope}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'readStatus',
        label: '状态',
        width: 'sm',
        renderCell: (record) => (
          <Chip size="sm" variant="soft" className={pageStyles.statusRead}>
            <Chip.Label>{record.readCount ?? 0}人已读</Chip.Label>
          </Chip>
        ),
      },
      {
        id: 'content',
        label: '内容',
        width: 'fill',
        align: 'start',
        renderCell: (record) => (
          <DataTable.TextCell title={formatOptionalText(record.content)}>
            {formatOptionalText(record.content)}
          </DataTable.TextCell>
        ),
      },
      {
        id: 'jumpUrl',
        label: '跳转地址',
        width: 'lg',
        align: 'start',
        renderCell: (record) => (
          <DataTable.TextCell muted title={formatOptionalText(record.jumpUrl)}>
            {formatOptionalText(record.jumpUrl)}
          </DataTable.TextCell>
        ),
      },
      {
        id: 'createTime',
        label: '创建时间',
        width: 'lg',
        renderCell: (record) => (
          <DataTable.TextCell>{formatDateTime(record.createTime)}</DataTable.TextCell>
        ),
      },
    ],
    []
  );

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setCurrentPage(nextPage);
    setPageSize(nextPageSize);
  };

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader title={page.title} subtitle={page.subtitle} />
      <DataTable<AdminMessage>
        ariaLabel="站内信列表"
        rowKey="messageId"
        items={messages}
        loading={loading}
        columns={columns}
        title="公告"
        emptyText="暂无站内信"
        className={pageStyles.messageTable}
        maxBodyHeight={560}
        toolbar={
          <div className={pageStyles.toolbarActions}>
            <Button variant="secondary" size="sm" onPress={() => setCreateModalOpen(true)}>
              创建公告
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={loading}
              onPress={() => {
                void refresh();
              }}
            >
              刷新
            </Button>
          </div>
        }
        pagination={{
          total,
          current: currentPage,
          pageSize,
          summary: `共 ${total} 条`,
          onChange: handlePageChange,
          pageSizeControl: (
            <Select
              aria-label="每页数量"
              value={String(pageSize)}
              onChange={(key) => {
                if (key == null || Array.isArray(key)) return;
                handlePageChange(1, Number(key));
              }}
              className={pageStyles.pageSizeSelect}
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
      />
      <CreateAnnouncementModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          if (currentPage === 1) {
            void refresh();
          } else {
            setCurrentPage(1);
          }
        }}
      />
    </div>
  );
}

export default AnnouncementManagement;

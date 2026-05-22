import IconText from '@/components/Common/IconText';
import GroupCard from '@/components/Group/GroupCard';
import { CreateGroupModal, JoinGroupModal } from '@/components/Group/GroupModals';
import { useGroupService } from '@/domains';
import type { FetchGroupListRequest, Group } from '@/domains/Group';
import { GROUP_ROLE_FILTER_MAP } from '@/domains/Group';
import { useAppMessage } from '@/hooks/useAppMessage';
import { usePagination } from 'ahooks';
import { Button, Col, Empty, Pagination, Row, Spin, Tabs } from 'antd';
import { useState } from 'react';
import { AiOutlinePlus, AiOutlineUserAdd } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import layout from '../style.module.less';
import page from './style.module.less';

function MyGroup() {
  const groupService = useGroupService();
  const message = useAppMessage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('joined');
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const groupRoleFilter = GROUP_ROLE_FILTER_MAP[activeTab] ?? GROUP_ROLE_FILTER_MAP.joined;

  const {
    data: groupsData,
    loading,
    refresh: refreshGroups,
    pagination: { current: pageNum, pageSize: size, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      const params: FetchGroupListRequest = {
        groupRoleFilter: groupRoleFilter,
        page: current,
        size: pageSize,
      };
      const { groups, total } = await groupService.fetchGroupList(params);
      return { list: groups, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: 8,
      refreshDeps: [groupRoleFilter],
      onError: () => {
        message.error('获取小组列表失败');
      },
    }
  );
  const groups: Group[] = groupsData?.list ?? [];
  const total = groupsData?.total ?? 0;

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (pageNum !== 1) {
      onPageChange(1, size);
    }
  };

  const handleModalSuccess = () => {
    setJoinGroupModalOpen(false);
    setCreateGroupModalOpen(false);
    void refreshGroups();
  };

  const handleGroupClick = (group: Group) => {
    if (group.groupId) {
      navigate(`/app/my-group/${group.groupId}`);
    }
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeaderWithActions}>
        <div>
          <h1 className={layout.pageTitle}>我的小组</h1>
          <span className={layout.pageSubtitle}>管理您的小组和协作</span>
        </div>
        <div className={layout.actionsRow}>
          <Button onClick={() => setJoinGroupModalOpen(true)}>
            <IconText icon={<AiOutlineUserAdd />} iconSize={16}>
              加入小组
            </IconText>
          </Button>
          <Button type="primary" onClick={() => setCreateGroupModalOpen(true)}>
            <IconText icon={<AiOutlinePlus />} iconSize={16}>
              新建小组
            </IconText>
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: 'joined', label: '我加入的' },
          { key: 'managed', label: '我管理的' },
        ]}
        className={layout.detailTabs}
      />

      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <div className={page.emptyState}>
            <Empty description="暂无小组" />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {groups.map((group) => (
              <Col key={group.groupId} xs={24} sm={12} md={8} lg={6}>
                <GroupCard group={group} onClick={handleGroupClick} />
              </Col>
            ))}
          </Row>
        )}

        {total > 0 && (
          <div className={layout.paginationWrap}>
            <Pagination
              current={pageNum}
              pageSize={size}
              total={total}
              showSizeChanger
              showTotal={(t) => `共 ${t} 条`}
              pageSizeOptions={['8', '16', '32', '64']}
              onChange={onPageChange}
            />
          </div>
        )}
      </Spin>

      <JoinGroupModal
        open={joinGroupModalOpen}
        onCancel={() => setJoinGroupModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        open={createGroupModalOpen}
        onCancel={() => setCreateGroupModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default MyGroup;

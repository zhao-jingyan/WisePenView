import React from 'react';
import { Modal, Button, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useResourceService, useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useRecentFilesStore } from '@/store';
import type { RemoveFileFromGroupModalProps } from './index.type';
import type { TagTreeNode } from '@/services/Tag/index.type';

const RemoveFileFromGroupModal: React.FC<RemoveFileFromGroupModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  file,
}) => {
  const tagService = useTagService();
  const resourceService = useResourceService();
  const message = useAppMessage();
  const removeRecentFile = useRecentFilesStore((s) => s.removeFile);

  const collectTagIds = (nodes: TagTreeNode[]): Set<string> => {
    const ids = new Set<string>();
    const walk = (node: TagTreeNode) => {
      ids.add(node.tagId);
      (node.children ?? []).forEach(walk);
    };
    nodes.forEach(walk);
    return ids;
  };

  const { loading, run: runRemoveFile } = useRequest(
    async () => {
      if (!file?.resourceId || !groupId) {
        return;
      }
      const groupTags = await tagService.getTagTree(groupId);
      const groupTagIdSet = collectTagIds(groupTags);
      const currentTagIds = Object.keys(file.currentTags ?? {});
      const currentGroupTagIds = currentTagIds.filter((tagId) => groupTagIdSet.has(tagId));
      if (currentGroupTagIds.length === 0) {
        return file.resourceId;
      }
      await resourceService.updateResourceTags({
        resourceId: file.resourceId,
        // group 维度下清空标签关系：不删除资源，仅移出当前小组标签体系
        tagIds: [],
        groupId,
      });
      return file.resourceId;
    },
    {
      manual: true,
      onSuccess: (removedResourceId) => {
        if (removedResourceId) {
          removeRecentFile(removedResourceId);
        }
        message.success('文件已移出小组空间');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '移出失败'));
      },
    }
  );

  const handleConfirm = async () => {
    if (!file?.resourceId || !groupId) return;
    runRemoveFile();
  };

  return (
    <Modal
      title="移出小组空间"
      open={open && !!file}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          danger
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={!groupId}
        >
          移出
        </Button>,
      ]}
      width={500}
    >
      <Alert description="确定将该文件移出小组空间吗？此操作不可撤销！" type="warning" showIcon />
    </Modal>
  );
};

export default RemoveFileFromGroupModal;

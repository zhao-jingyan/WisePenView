import React, { useState, useCallback, useRef } from 'react';
import { useRequest } from 'ahooks';
import { Button, Tabs } from 'antd';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import { RiPenNibFill } from 'react-icons/ri';
import { LuTags } from 'react-icons/lu';
import FlatDrive from '@/components/Drive/FlatDrive';
import TreeDrive from '@/components/Drive/TreeDrive';
import UploadQueueTab from '@/components/Drive/UploadQueueTab';
import type { UploadQueueTabRef } from '@/components/Drive/UploadQueueTab';
import { StickerManageModal } from '@/components/Drive/Modals';
import { useNoteService, useUserService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { RESOURCE_TYPE } from '@/constants/resource';
import { useDrivePreferencesStore, useRecentFilesStore, type DriveViewMode } from '@/store';

import { UploadDocumentModal } from './UploadDocumentModal';
import styles from './style.module.less';

const VIEW_TABS: { key: DriveViewMode; label: string }[] = [
  { key: 'folder', label: '文件夹管理' },
  { key: 'flat', label: '按标签管理' },
  { key: 'uploadQueue', label: '上传队列' },
];

const Drive: React.FC = () => {
  const navigate = useNavigate();
  const viewMode = useDrivePreferencesStore((s) => s.viewMode);
  const setViewMode = useDrivePreferencesStore((s) => s.setViewMode);
  const addRecentFile = useRecentFilesStore((s) => s.addFile);
  const noteService = useNoteService();
  const userService = useUserService();
  const messageApi = useAppMessage();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [stickerManageOpen, setStickerManageOpen] = useState(false);
  const uploadQueueRef = useRef<UploadQueueTabRef>(null);
  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw new Error('创建笔记失败：未获取到资源ID');
      }
      const currentUser = await userService.getUserInfo();
      return {
        resourceId,
        ownerInfo: currentUser,
      };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, ownerInfo }) => {
        addRecentFile({
          resourceId,
          resourceName: '未命名笔记',
          ownerInfo,
          resourceType: RESOURCE_TYPE.NOTE,
        });
        navigate(`/app/note/${encodeURIComponent(resourceId)}`);
      },
      onError: () => {
        messageApi.error('创建笔记失败，请稍后重试');
      },
    }
  );

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    runCreateNote();
  }, [creatingNote, runCreateNote]);

  const handleUploadSuccess = useCallback(() => {
    uploadQueueRef.current?.refresh();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>文档与云盘</h1>
          <span className={styles.pageSubtitle}>管理您的项目和文档</span>
        </div>
        <div className={styles.actionsRow}>
          <Button
            type="default"
            icon={<AiOutlineCloudUpload size={16} />}
            onClick={() => setUploadModalOpen(true)}
          >
            上传文件
          </Button>
          <Button
            type="primary"
            icon={<RiPenNibFill size={16} />}
            loading={creatingNote}
            onClick={handleCreateNote}
          >
            新建笔记
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={viewMode}
        onChange={(k) => setViewMode(k as DriveViewMode)}
        items={VIEW_TABS}
        className={styles.detailTabs}
      />

      <div className={styles.previewContent}>
        {viewMode === 'flat' && <FlatDrive />}
        {viewMode === 'folder' && <TreeDrive />}
        {viewMode === 'uploadQueue' && <UploadQueueTab ref={uploadQueueRef} />}
      </div>

      <UploadDocumentModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
      <StickerManageModal open={stickerManageOpen} onCancel={() => setStickerManageOpen(false)} />
    </div>
  );
};

export default Drive;

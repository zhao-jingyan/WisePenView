import TableDrive from '@/components/Drive/TableDrive';
import type { TableDriveHandle } from '@/components/Drive/TableDrive/index.type';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import {
  buildDrivePath,
  DRIVE_FAVORITES_PATH,
  DRIVE_UPLOAD_QUEUE_PATH,
  parseDriveRouteLocation,
} from '@/utils/navigation/driveRoute';
import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import FavoritesTab from '../_components/FavoritesTab';
import GlobalSearchBox from '../_components/GlobalSearchBox';
import UploadQueueTab from '../_components/UploadQueueTab';
import styles from './style.module.less';

export type DriveViewMode = 'uploadQueue' | 'tableDrive' | 'favorites';

const VIEW_TABS: { key: DriveViewMode; label: string }[] = [
  { key: 'tableDrive', label: '云盘' },
  { key: 'uploadQueue', label: '上传队列' },
  { key: 'favorites', label: '我的收藏' },
];

interface DriveProps {
  viewMode?: DriveViewMode;
}

function Drive({ viewMode = 'tableDrive' }: DriveProps) {
  const navigate = useNavigate();
  const { folderId, groupId } = useParams();
  const driveLocation = useMemo(
    () => parseDriveRouteLocation({ groupId, folderId }),
    [folderId, groupId]
  );
  const workspaceScope = useWorkspaceNavigationStore((state) => state.location.scope);
  const tableDriveRef = useRef<TableDriveHandle>(null);
  const [isTrashView, setIsTrashView] = useState(false);

  /**
   * URL 在浏览器前进、后退和外部链接进入时变化，侧栏仍依赖 workspace store，
   * 因此必须在路由提交后同步 scope；该同步不能由用户事件或渲染派生替代，且无需 cleanup。
   */
  useEffectForce(() => {
    if (viewMode !== 'tableDrive') return;

    const currentScope = useWorkspaceNavigationStore.getState().location.scope;
    const currentGroupId = currentScope.type === 'group' ? currentScope.groupId : undefined;
    const nextGroupId =
      driveLocation.scope.type === 'group' ? driveLocation.scope.groupId : undefined;
    if (currentScope.rootId === driveLocation.scope.rootId && currentGroupId === nextGroupId) {
      return;
    }
    useWorkspaceNavigationStore.getState().navigateToScope(driveLocation.scope);
  }, [driveLocation.scope, viewMode]);

  const handleCurrentNodeChange = (nodeId: string) => {
    navigate(buildDrivePath({ scope: driveLocation.scope, nodeId }));
  };

  const handleViewModeChange = (nextViewMode: DriveViewMode) => {
    if (nextViewMode === viewMode) return;
    if (nextViewMode === 'uploadQueue') {
      navigate(DRIVE_UPLOAD_QUEUE_PATH);
      return;
    }
    if (nextViewMode === 'favorites') {
      navigate(DRIVE_FAVORITES_PATH);
      return;
    }
    navigate(buildDrivePath({ scope: workspaceScope }));
  };

  const tableDriveLocationKey = `${driveLocation.scope.rootId}\u0000${driveLocation.initialNodeId ?? driveLocation.scope.rootId}`;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>文档与云盘</h1>
          <span className={styles.pageSubtitle}>管理您的项目和文档</span>
        </div>
        <div className={styles.actionsRow}>
          <GlobalSearchBox
            scope={viewMode === 'tableDrive' ? driveLocation.scope : workspaceScope}
          />
          {viewMode === 'tableDrive' ? (
            <Button
              variant="primary"
              className={styles.pageTrashButton}
              onPress={() => void tableDriveRef.current?.openTrash()}
            >
              <Trash2 size={16} aria-hidden="true" />
              {isTrashView ? '返回云盘' : '回收站'}
            </Button>
          ) : null}
        </div>
      </div>

      <SegmentedTabs<DriveViewMode>
        ariaLabel="云盘视图"
        selectedKey={viewMode}
        onSelectionChange={handleViewModeChange}
        items={VIEW_TABS}
        className={styles.detailTabs}
      />

      <div className={styles.previewContent}>
        {viewMode === 'tableDrive' && (
          <TableDrive
            key={tableDriveLocationKey}
            ref={tableDriveRef}
            scope={driveLocation.scope}
            initialNodeId={driveLocation.initialNodeId}
            onCurrentNodeChange={handleCurrentNodeChange}
            showToolbarTrash={false}
            onTrashViewChange={setIsTrashView}
          />
        )}
        {viewMode === 'uploadQueue' && <UploadQueueTab />}
        {viewMode === 'favorites' && <FavoritesTab />}
      </div>
    </div>
  );
}

export default Drive;

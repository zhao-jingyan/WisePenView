import {
  isDriveActionTarget,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import { DeleteNodeModal, RenameNodeModal } from '@/components/Drive/Modals';
import EntryIcon from '@/components/Icons/EntryIcon';
import type { DriveNode } from '@/domains/Drive';
import { Button } from '@heroui/react';
import { Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TableDriveSelectionPanelProps } from './index.type';
import NodeInfoSection from './parts/NodeInfoSection';
import styles from './style.module.less';

const EMPTY_HINT = '选中左侧文件或文件夹以查看详情';

function toActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function TableDriveSelectionPanel({
  selectedRow,
  batchEditMode = false,
  batchSelectedCount = 0,
  groupId,
  onEnter,
  onOpen,
  onClear,
  onRefresh,
}: TableDriveSelectionPanelProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const node = selectedRow?.node;
  const actionTarget = useMemo(() => (node ? toActionTarget(node) : null), [node]);
  const isFolder = node?.type === 'folder';
  const isFile = node?.type === 'resource' || node?.type === 'link';
  const canRename = actionTarget != null && actionTarget.type !== 'link';

  const handleDeleteSuccess = () => {
    onClear();
    onRefresh();
  };

  if (batchEditMode) {
    return (
      <aside className={styles.panel} aria-label="全局编辑">
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <span className={styles.title}>全局编辑</span>
              <span className={styles.typeLabel}>批量选择模式</span>
            </div>
          </div>
          <div className={styles.body}>
            <span className={styles.fieldLabel}>已选</span>
            <p className={styles.description}>{batchSelectedCount} 项</p>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedRow || !node || node.type === 'loading') {
    return (
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header} aria-hidden="true" />
          <div className={styles.emptyState}>{EMPTY_HINT}</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.iconWrap} aria-hidden="true">
              <EntryIcon
                entryType={selectedRow.entryType}
                resourceType={selectedRow.resourceType}
                resourceIconType={selectedRow.resourceIconType}
                size={18}
              />
            </span>
            <div className={styles.titleBlock}>
              <span className={styles.title}>{selectedRow.name}</span>
              <span className={styles.typeLabel}>{selectedRow.typeLabel}</span>
            </div>
            {canRename ? (
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                className={styles.renameBtn}
                aria-label="重命名"
                onPress={() => setRenameOpen(true)}
              >
                <Pencil size={16} aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className={styles.body}>
            <NodeInfoSection selectedRow={selectedRow} />
          </div>

          {actionTarget ? (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                className={styles.actionBtn}
                onPress={() => setDeleteOpen(true)}
              >
                删除
              </Button>
              {isFolder ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onEnter(node.id)}
                >
                  进入
                </Button>
              ) : null}
              {isFile ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onOpen(node)}
                >
                  打开
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <RenameNodeModal
        isOpen={renameOpen}
        node={actionTarget}
        groupId={groupId}
        onOpenChange={setRenameOpen}
        onSuccess={onRefresh}
      />
      <DeleteNodeModal
        isOpen={deleteOpen}
        node={actionTarget}
        groupId={groupId}
        onOpenChange={setDeleteOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}

export default TableDriveSelectionPanel;

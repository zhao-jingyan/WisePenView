import DriveNav from '@/components/Drive/DriveNav';
import { useDriveService } from '@/domains';
import type { FolderNode, IDriveService } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState } from 'react';
import { getDriveScopeGroupId, type DriveActionTarget } from '../../../common/driveComponentModel';
import type { MoveNodeModalProps } from './index.type';
import styles from './style.module.less';

const getNodeName = (node: DriveActionTarget): string => {
  if (node.type === 'folder') return node.name;
  if (node.type === 'resource' || node.type === 'link') return node.title;
  return '';
};

async function collectFolderDescendantIds(
  driveService: IDriveService,
  folderId: string,
  groupId: string | undefined,
  visited: Set<string>
): Promise<void> {
  if (visited.has(folderId)) return;
  visited.add(folderId);

  const children = await driveService.listNodeChildren({ nodeId: folderId, groupId });
  const folderChildren = children.filter((child): child is FolderNode => child.type === 'folder');
  await Promise.all(
    folderChildren.map((child) =>
      collectFolderDescendantIds(driveService, child.id, groupId, visited)
    )
  );
}

function MoveNodeModal({
  isOpen,
  node,
  rootId,
  groupId,
  onOpenChange,
  onSuccess,
}: MoveNodeModalProps) {
  const driveService = useDriveService();
  const [selectedTargetId, setSelectedTargetId] = useState<string>();
  const effectiveRootId = node?.scope.rootId ?? rootId;
  const effectiveGroupId = groupId ?? (node ? getDriveScopeGroupId(node.scope) : undefined);

  const { data: blockedIds } = useRequest(
    async (): Promise<Set<string>> => {
      if (!node) return new Set();
      const blocked = new Set<string>([node.id]);
      if (node.type !== 'folder') return blocked;
      await collectFolderDescendantIds(driveService, node.id, effectiveGroupId, blocked);
      return blocked;
    },
    {
      ready: isOpen && Boolean(node),
      refreshDeps: [isOpen, node?.id, effectiveRootId, effectiveGroupId],
      onBefore: () => {
        setSelectedTargetId(undefined);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const finalBlockedIds = useMemo(() => blockedIds ?? new Set<string>(), [blockedIds]);
  const disabledTargetIds = useMemo(() => {
    const next = new Set(finalBlockedIds);
    if (effectiveGroupId && node && (node.type === 'resource' || node.type === 'link')) {
      next.add(effectiveRootId);
    }
    return next;
  }, [effectiveGroupId, effectiveRootId, finalBlockedIds, node]);

  const { loading: moving, run: runMove } = useRequest(
    async () => {
      if (!node || !selectedTargetId) return;
      await driveService.moveToFolder({
        nodeId: node.id,
        targetFolderNodeId: selectedTargetId,
        groupId: effectiveGroupId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('移动成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!node || !selectedTargetId) return;
    runMove();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && moving) return;
    onOpenChange(nextOpen);
  };

  return (
    <Modal isOpen={isOpen && !!node} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!moving}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>移动到文件夹</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.wrapper}>
                {node ? <div className={styles.hint}>即将移动：{getNodeName(node)}</div> : null}
                <div className={styles.treeWrap}>
                  <DriveNav
                    rootId={effectiveRootId}
                    groupId={effectiveGroupId}
                    renderableTypes={['root', 'folder']}
                    selectableTypes={['root', 'folder']}
                    disabledNodeIds={[...disabledTargetIds]}
                    onChange={(selected) => {
                      const targetFolder = selected.find(
                        (item) => item.kind === 'root' || item.kind === 'folder'
                      );
                      setSelectedTargetId(targetFolder?.nodeId);
                    }}
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={moving}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={moving || !selectedTargetId}
              >
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default MoveNodeModal;

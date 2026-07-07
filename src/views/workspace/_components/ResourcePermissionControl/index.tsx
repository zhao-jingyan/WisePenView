import { Popover } from '@/components/Overlay';
import { useUserService } from '@/domains';
import { useOptionalWorkspaceRouteContext } from '@/layouts/Workspace/WorkspaceOutletContext';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import ResourcePermissionPanel from '../ResourcePermissionPanel';
import type { ResourcePermissionControlProps } from './index.type';
import styles from './style.module.less';

function ResourcePermissionControl({
  resourceId,
  resourceType,
  ownerId,
  isDisabled,
  onSuccess,
}: ResourcePermissionControlProps) {
  const userService = useUserService();
  const routeContext = useOptionalWorkspaceRouteContext();
  const resolvedResourceType = resourceType ?? routeContext?.resourceType;
  const [isPermissionPanelOpen, setIsPermissionPanelOpen] = useState(false);
  const normalizedOwnerId = normalizeId(ownerId);
  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(normalizedOwnerId),
    refreshDeps: [normalizedOwnerId],
  });
  const canManagePermission = Boolean(
    resourceId && resolvedResourceType && normalizedOwnerId && currentUser?.id === normalizedOwnerId
  );

  if (!canManagePermission) {
    return null;
  }

  return (
    <Popover isOpen={isPermissionPanelOpen} onOpenChange={setIsPermissionPanelOpen}>
      <Popover.Trigger>
        <Button variant="secondary" size="sm" isDisabled={isDisabled}>
          <ShieldCheck size={16} aria-hidden />
          <span>权限</span>
          <ChevronDown size={12} aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.popoverContent} placement="bottom end">
        <Popover.Dialog>
          <Popover.DeferredContent fallback={<div className={styles.deferredPanel} />}>
            {() =>
              resolvedResourceType ? (
                <ResourcePermissionPanel
                  resourceId={resourceId}
                  resourceType={resolvedResourceType}
                  onSuccess={onSuccess}
                />
              ) : null
            }
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ResourcePermissionControl;

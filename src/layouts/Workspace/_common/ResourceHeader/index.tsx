import EntryIcon from '@/components/Icons/EntryIcon';
import ResourcePermissionModal from '@/components/Resource/ResourcePermissionModal';
import { useUserService } from '@/domains';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { Button, Dropdown } from '@heroui/react';
import { useRequest } from 'ahooks';
import {
  ChevronRight,
  Copy,
  Download,
  Ellipsis,
  FolderInput,
  HardDrive,
  History,
  Link2,
  MessageSquare,
  Printer,
  Settings2,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ResourceHeaderMoreMenu, ResourceHeaderProps } from './index.type';
import styles from './style.module.less';

interface ResourceHeaderMenuItemContentProps {
  icon: LucideIcon;
  label: string;
  trailing?: ReactNode;
}

function ResourceHeaderMenuItemContent({
  icon: Icon,
  label,
  trailing,
}: ResourceHeaderMenuItemContentProps) {
  return (
    <span className={styles.menuItemContent}>
      <Icon className={styles.menuItemIcon} size={16} aria-hidden="true" />
      <span className={styles.menuItemLabel} data-slot="label">
        {label}
      </span>
      {trailing ? <span className={styles.menuItemTrailing}>{trailing}</span> : null}
    </span>
  );
}

function ResourceHeaderMore({
  menu,
  canManagePermission,
  isDisabled,
  onOpenPermission,
}: {
  menu?: ResourceHeaderMoreMenu;
  canManagePermission: boolean;
  isDisabled?: boolean;
  onOpenPermission: () => void;
}) {
  const handleAction = (key: React.Key) => {
    if (key === 'permission') {
      onOpenPermission();
      return;
    }
    if (key === 'comment-history') {
      menu?.onCommentHistory?.();
      return;
    }
    if (key === 'print') {
      menu?.onPrint?.();
      return;
    }
    if (key === 'download') {
      menu?.download?.onAction();
    }
  };

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          isPending={menu?.isPending}
          isDisabled={isDisabled}
          aria-label="更多"
        >
          <Ellipsis size={18} aria-hidden="true" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className={styles.popover}>
        <div className={styles.popoverHeader}>更多操作</div>
        <Dropdown.Menu aria-label="资源更多操作" onAction={handleAction}>
          <Dropdown.Section>
            <Dropdown.Item id="version-management" textValue="版本管理" isDisabled>
              <ResourceHeaderMenuItemContent icon={History} label="版本管理" />
            </Dropdown.Item>
            <Dropdown.Item id="create-copy" textValue="创建副本" isDisabled>
              <ResourceHeaderMenuItemContent icon={Copy} label="创建副本" />
            </Dropdown.Item>
          </Dropdown.Section>
          <Dropdown.Section>
            <Dropdown.Item id="add-shortcut" textValue="添加快捷方式到" isDisabled>
              <ResourceHeaderMenuItemContent icon={Link2} label="添加快捷方式到" />
            </Dropdown.Item>
            <Dropdown.Item id="move-to" textValue="移动到" isDisabled>
              <ResourceHeaderMenuItemContent icon={FolderInput} label="移动到" />
            </Dropdown.Item>
          </Dropdown.Section>
          {canManagePermission ? (
            <Dropdown.Section>
              <Dropdown.Item id="permission" textValue="权限">
                <ResourceHeaderMenuItemContent icon={ShieldCheck} label="权限" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          {menu?.showCommentHistory ? (
            <Dropdown.Section>
              <Dropdown.Item
                id="comment-history"
                textValue="历史批注"
                isDisabled={!menu.onCommentHistory}
              >
                <ResourceHeaderMenuItemContent icon={MessageSquare} label="历史批注" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          <Dropdown.Section>
            <Dropdown.Item id="print" textValue="打印" isDisabled={!menu?.onPrint}>
              <ResourceHeaderMenuItemContent icon={Printer} label="打印" />
            </Dropdown.Item>
            <Dropdown.Item
              id="download"
              textValue={menu?.download?.label ?? '下载为'}
              isDisabled={!menu?.download}
            >
              <ResourceHeaderMenuItemContent
                icon={Download}
                label={menu?.download?.label ?? '下载为'}
              />
            </Dropdown.Item>
          </Dropdown.Section>
          {menu?.advanced ? (
            <Dropdown.Section>
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="advanced" textValue="高级">
                  <ResourceHeaderMenuItemContent
                    icon={Settings2}
                    label="高级"
                    trailing={<Dropdown.SubmenuIndicator />}
                  />
                </Dropdown.Item>
                <Dropdown.Popover
                  placement="right top"
                  className={`${styles.popover} ${styles.advancedPopover}`}
                >
                  <div className={styles.advancedPanel}>
                    <div className={styles.popoverHeader}>高级设置</div>
                    {menu.advanced}
                  </div>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            </Dropdown.Section>
          ) : null}
          <Dropdown.Section>
            <Dropdown.Item id="delete" textValue="删除" isDisabled variant="danger">
              <ResourceHeaderMenuItemContent icon={Trash2} label="删除" />
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function ResourceHeader({
  resourceId,
  resourceName,
  resourceType,
  resourceIconType,
  permissionResourceType,
  ownerId,
  onPermissionSuccess,
  isDisabled,
  titleMeta,
  breadcrumbItems,
  onBreadcrumbNavigate,
  leadingActions,
  actions,
  moreMenu,
}: ResourceHeaderProps) {
  const userService = useUserService();
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const normalizedOwnerId = normalizeId(ownerId);
  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(resourceId && normalizedOwnerId),
    refreshDeps: [resourceId, normalizedOwnerId],
  });
  const canManagePermission = Boolean(
    resourceId && normalizedOwnerId && currentUser?.id === normalizedOwnerId
  );
  return (
    <>
      <div className={styles.root}>
        <div className={styles.title}>
          <nav className={styles.breadcrumb} aria-label="资源路径">
            {breadcrumbItems.map((item, index) => (
              <span key={item.nodeId} className={styles.breadcrumbSegment}>
                <button
                  type="button"
                  className={styles.breadcrumbButton}
                  onClick={() => onBreadcrumbNavigate(item.nodeId)}
                >
                  {index === 0 ? (
                    <HardDrive className={styles.breadcrumbIcon} size={14} aria-hidden />
                  ) : null}
                  {item.label}
                </button>
                <ChevronRight className={styles.breadcrumbSeparator} size={14} aria-hidden />
              </span>
            ))}
            <span className={styles.breadcrumbCurrent} aria-current="page">
              <span className={styles.titleIcon} aria-hidden="true">
                <EntryIcon
                  entryType="resource"
                  resourceType={resourceType}
                  resourceName={resourceName}
                  resourceIconType={resourceIconType}
                />
              </span>
              <span className={styles.titleText}>{resourceName}</span>
            </span>
          </nav>
          {titleMeta ? <span className={styles.titleMeta}>{titleMeta}</span> : null}
        </div>
        <div className={styles.actions}>
          {leadingActions}
          {actions}
          {resourceId ? (
            <ResourceHeaderMore
              menu={moreMenu}
              canManagePermission={canManagePermission}
              isDisabled={isDisabled}
              onOpenPermission={() => setIsPermissionModalOpen(true)}
            />
          ) : null}
        </div>
      </div>
      {resourceId && canManagePermission ? (
        <ResourcePermissionModal
          isOpen={isPermissionModalOpen}
          onOpenChange={setIsPermissionModalOpen}
          resourceId={resourceId}
          resourceType={permissionResourceType}
          onSuccess={onPermissionSuccess}
        />
      ) : null}
    </>
  );
}

export default ResourceHeader;

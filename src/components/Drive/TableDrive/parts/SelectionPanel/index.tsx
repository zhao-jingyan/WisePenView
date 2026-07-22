import { RESOURCE_PERMISSION_PRESETS } from '@/components/Drive/common/resourcePermissionPolicy';
import { TAG_PERMISSION_PRESETS } from '@/components/Drive/common/tagPermissionPreset';
import EntryIcon from '@/components/Icons/EntryIcon';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox } from '@heroui/react';
import { FolderInput, Pencil, Settings, ShieldCheck } from 'lucide-react';
import { useTableDriveSelectionController } from './hooks/useTableDriveSelectionController';
import type { TableDriveSelectionPanelProps } from './index.type';
import NodeInfoSection from './parts/NodeInfoSection';
import styles from './style.module.less';

const EMPTY_HINT = '选中左侧文件或文件夹以查看详情';
const FAVORITE_EMPTY_HINT = '选中左侧资源以查看详情';

function TableDriveSelectionPanel({
  selectedRow,
  selectedCount = 0,
  mode = 'drive',
  groupId,
  isTrashView = false,
  canManageTagPermission = false,
  tagPermissionRefreshToken,
  resourcePermissionRefreshToken,
  onEnter,
  onOpen,
  onRename,
  onMove,
  onDelete,
  onRemoveFavorite,
  onManageTagAccessPermission,
  onManageTagMountPermission,
  onManageResourcePermission,
  onTagPermissionChange,
}: TableDriveSelectionPanelProps) {
  const controller = useTableDriveSelectionController({
    selectedRow,
    selectedCount,
    mode,
    groupId,
    canManageTagPermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    onManageTagAccessPermission,
    onManageTagMountPermission,
    onManageResourcePermission,
    onTagPermissionChange,
  });
  const deleteActionLabel = groupId
    ? '移除'
    : isTrashView
      ? '永久删除'
      : controller.actionTarget?.type === 'link'
        ? '删除链接'
        : '移入回收站';
  const moveActionLabel = isTrashView ? '移动到云盘' : '移动';

  if (selectedCount > 1) {
    return (
      <aside className={styles.panel} aria-label="多选节点详情">
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <span className={styles.title}>已选 {selectedCount} 项</span>
              <span className={styles.typeLabel}>多选</span>
            </div>
          </div>
          <div className={styles.body}>
            <span className={styles.fieldLabel}>拖拽</span>
            <p className={styles.description}>拖动任一已选行到文件夹，可同时移动这些项目。</p>
            <p className={styles.descriptionMuted}>
              按住 Cmd 或 Ctrl 点击行，可继续添加或移除选择。
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedRow || !controller.node || controller.node.type === 'loading') {
    return (
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header} aria-hidden="true" />
          <div className={styles.emptyState}>
            {controller.isFavoriteMode ? FAVORITE_EMPTY_HINT : EMPTY_HINT}
          </div>
        </div>
      </aside>
    );
  }

  const node = controller.node;
  const actionTarget = controller.actionTarget;

  return (
    <aside className={styles.panel} aria-label="选中节点详情">
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.iconWrap} aria-hidden="true">
            <EntryIcon
              entryType={selectedRow.entryType}
              folderIconType={selectedRow.folderIconType}
              resourceType={selectedRow.resourceType}
              resourceIconType={selectedRow.resourceIconType}
              size={18}
            />
          </span>
          <div className={styles.titleBlock}>
            <span className={styles.title}>{selectedRow.name}</span>
            <span className={styles.typeLabel}>{selectedRow.typeLabel}</span>
          </div>
          {controller.canRename ? (
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              className={styles.renameBtn}
              aria-label="重命名"
              onPress={() => {
                if (actionTarget) onRename(actionTarget);
              }}
            >
              <Pencil size={16} aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <div className={styles.body}>
          <NodeInfoSection selectedRow={selectedRow} />
          {controller.canShowTagPermission ? (
            <section className={styles.permissionSection} aria-label="访问策略">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span className={styles.sectionTitle}>访问策略</span>
                </div>
              </div>
              <div className={styles.permissionSummary}>
                {controller.tagPermissionLoading
                  ? '正在加载访问策略'
                  : `${controller.selectedPresetOption.label}：${controller.selectedPresetOption.description}`}
              </div>
              <ListBox
                aria-label="标签访问策略预设"
                selectionMode="single"
                selectedKeys={controller.selectedPresetListKeys}
                onSelectionChange={controller.onPresetSelectionChange}
                onAction={(key) => {
                  if (String(key) === 'custom') controller.onPresetSelect('custom');
                }}
                className={styles.permissionPresetList}
              >
                {TAG_PERMISSION_PRESETS.map((preset) => (
                  <ListBox.Item
                    id={preset.key}
                    key={preset.key}
                    textValue={preset.label}
                    onPointerUp={
                      preset.key === 'custom' && controller.selectedPresetKey === 'custom'
                        ? () => controller.onPresetSelect('custom')
                        : undefined
                    }
                    onKeyDown={
                      preset.key === 'custom' && controller.selectedPresetKey === 'custom'
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              controller.onPresetSelect('custom');
                            }
                          }
                        : undefined
                    }
                  >
                    <span className={styles.presetContent}>
                      <span className={styles.presetTitle}>{preset.label}</span>
                      <span className={styles.presetDescription}>{preset.description}</span>
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </section>
          ) : null}
          {controller.canShowTagPermission ? (
            <section className={styles.permissionSection} aria-label="挂载策略">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <FolderInput size={15} aria-hidden="true" />
                  <span className={styles.sectionTitle}>挂载策略</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  className={styles.configBtn}
                  aria-label="配置挂载策略"
                  isDisabled={controller.tagPermissionLoading}
                  onPress={controller.onMountConfigPress}
                >
                  <Settings size={15} aria-hidden="true" />
                </Button>
              </div>
              <div className={styles.permissionSummary}>
                {controller.tagPermissionLoading
                  ? '正在加载挂载策略'
                  : controller.selectedMountPresetSummary}
              </div>
            </section>
          ) : null}
          {controller.canShowResourcePermission ? (
            <section className={styles.permissionSection} aria-label="资源权限策略">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span className={styles.sectionTitle}>权限策略</span>
                </div>
              </div>
              <div className={styles.permissionSummary}>
                {controller.resourcePermissionLoading
                  ? '正在加载权限策略'
                  : controller.resourcePermissionError
                    ? parseErrorMessage(controller.resourcePermissionError)
                    : `${controller.selectedResourcePresetOption.label}：${controller.selectedResourcePresetOption.description}`}
              </div>
              {controller.resourcePermissionPolicy.isInconsistentWithTag ? (
                <div className={styles.permissionWarning}>与标签权限不一致，仅对此资源生效。</div>
              ) : null}
              <ListBox
                aria-label="资源权限预设"
                selectionMode="single"
                selectedKeys={controller.selectedResourcePresetListKeys}
                disabledKeys={controller.disabledResourcePresetKeys}
                onSelectionChange={controller.onResourcePresetSelectionChange}
                onAction={(key) => {
                  if (String(key) === 'custom') {
                    void controller.onResourcePresetSelect('custom');
                  }
                }}
                className={styles.permissionPresetList}
              >
                {RESOURCE_PERMISSION_PRESETS.map((preset) => (
                  <ListBox.Item
                    id={preset.key}
                    key={preset.key}
                    textValue={preset.label}
                    onPointerUp={
                      preset.key === 'custom' && controller.selectedResourcePresetKey === 'custom'
                        ? () => void controller.onResourcePresetSelect('custom')
                        : undefined
                    }
                    onKeyDown={
                      preset.key === 'custom' && controller.selectedResourcePresetKey === 'custom'
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              void controller.onResourcePresetSelect('custom');
                            }
                          }
                        : undefined
                    }
                  >
                    <span className={styles.presetContent}>
                      <span className={styles.presetTitle}>{preset.label}</span>
                      <span className={styles.presetDescription}>{preset.description}</span>
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </section>
          ) : null}
        </div>

        {actionTarget && controller.isFavoriteMode ? (
          <div className={styles.actions}>
            <Button
              variant="secondary"
              size="sm"
              className={styles.actionBtn}
              onPress={() => onRemoveFavorite?.(actionTarget)}
            >
              移出收藏夹
            </Button>
            {controller.isFile ? (
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
        {actionTarget && !controller.isFavoriteMode ? (
          <div className={styles.actions}>
            {controller.canModifyActionTarget ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onDelete(actionTarget)}
                >
                  {deleteActionLabel}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onMove(actionTarget)}
                >
                  <FolderInput size={16} aria-hidden="true" />
                  {moveActionLabel}
                </Button>
              </>
            ) : null}
            {controller.isFolder ? (
              <Button
                variant="secondary"
                size="sm"
                className={styles.actionBtn}
                onPress={() => onEnter(node.id)}
              >
                进入
              </Button>
            ) : null}
            {controller.isFile ? (
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
  );
}

export default TableDriveSelectionPanel;

import DriveNav from '@/components/Drive/DriveNav';
import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  resolveTagPermissionActionPresetKey,
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  TAG_PERMISSION_ACTION_ROWS,
  TAG_PERMISSION_RESOURCE_STRATEGIES,
} from '@/components/Drive/common/tagPermissionPreset';
import { Empty, Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import { useTagService } from '@/domains';
import { mapTagToFolderNode } from '@/domains/Drive/mapper/DriveServices.map';
import {
  ACCESS_CONTROL_SCOPE,
  getTagPermissionPresetValues,
  normalizeResourceActions,
  updateResourceActionSelection,
  type AccessControlScope,
  type TagPermissionPresetKey,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import { useEffectForce } from '@/hooks/useEffectForce';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import {
  resolveDriveScope,
  toDriveSelectionItem,
  type DriveSelectionItem,
} from '../../common/driveComponentModel';
import type { TagPermissionModalProps } from './index.type';
import styles from './style.module.less';

type TagPermissionFormValues = {
  taggedResourceAclGrantScope: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers: string[];
  tagMountPermissionScope: AccessControlScope;
  tagMountSpecifiedUsers: string[];
  grantedActions: TagResourceAction[];
};

const DEFAULT_FORM_VALUES: TagPermissionFormValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: [],
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: [],
  grantedActions: [],
};

const buildSelectionFromTag = (tag: TagTreeNode, groupId?: string): DriveSelectionItem => {
  const scope = resolveDriveScope(groupId ? { type: 'group', groupId } : undefined).scope;
  const node = mapTagToFolderNode(tag, null, scope);
  const selection = toDriveSelectionItem(node);
  if (selection) return selection;
  return {
    nodeId: node.id,
    kind: 'folder',
    label: node.name,
    parentNodeId: node.parentId,
    scope,
    rootId: scope.rootId,
    groupId: scope.type === 'group' ? scope.groupId : undefined,
    tagId: tag.tagId,
  };
};

const buildFormFromTag = (tag: TagTreeNode): TagPermissionFormValues => ({
  taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL,
  taggedResourceAclGrantSpecifiedUsers: tag.taggedResourceAclGrantSpecifiedUsers ?? [],
  tagMountPermissionScope: tag.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL,
  tagMountSpecifiedUsers: tag.tagMountSpecifiedUsers ?? [],
  grantedActions: normalizeResourceActions(tag.grantedActions),
});

const TagPermissionModal = ({
  isOpen,
  groupId,
  initialTagId,
  onOpenChange,
  onSuccess,
}: TagPermissionModalProps) => {
  const tagService = useTagService();
  const [permissionForm, setPermissionForm] =
    useState<TagPermissionFormValues>(DEFAULT_FORM_VALUES);
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [initialTagLoading, setInitialTagLoading] = useState(false);
  const showTagTree = !initialTagId;
  const selectedActionPresetKey = resolveTagPermissionActionPresetKey(
    permissionForm.grantedActions
  );

  const resetPermissionForm = () => {
    setPermissionForm(DEFAULT_FORM_VALUES);
  };

  const applyPresetToForm = (presetKey: TagPermissionPresetKey) => {
    const presetValues = getTagPermissionPresetValues(presetKey);
    if (!presetValues) return;
    setPermissionForm({
      taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
      taggedResourceAclGrantSpecifiedUsers: [],
      tagMountPermissionScope: presetValues.tagMountPermissionScope,
      tagMountSpecifiedUsers: [],
      grantedActions: presetValues.grantedActions,
    });
  };

  const applyTagToForm = (tag: TagTreeNode) => {
    setPermissionForm(buildFormFromTag(tag));
  };

  const resolveTagById = async (tagId: string): Promise<TagTreeNode | undefined> => {
    let nextTag = tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);
    if (!nextTag) {
      await tagService.getRawTagTree(groupId);
      nextTag = tagService.getRawTagById(tagId, groupId);
    }
    if (!nextTag) {
      await tagService.getTagTree(groupId);
      nextTag = tagService.getTagById(tagId, groupId);
    }
    return nextTag;
  };

  const resolveCachedTag = (tagId: string): TagTreeNode | undefined =>
    tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);

  const handleModalShow = () => {
    setSelectedTag(null);
    resetPermissionForm();
    setTagRefreshSeed((prev) => prev + 1);
    void (async () => {
      if (initialTagId) {
        setInitialTagLoading(true);
        const cachedTag = resolveCachedTag(initialTagId);
        if (cachedTag) {
          setSelectedTag(buildSelectionFromTag(cachedTag, groupId));
          applyTagToForm(cachedTag);
        }
        try {
          await tagService.getRawTagTree(groupId);
          const tag = await resolveTagById(initialTagId);
          if (tag) {
            setSelectedTag(buildSelectionFromTag(tag, groupId));
            applyTagToForm(tag);
          }
        } catch (err) {
          toast.danger(parseErrorMessage(err));
        } finally {
          setInitialTagLoading(false);
        }
        return;
      }

      try {
        await tagService.getRawTagTree(groupId);
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
  };

  const handleTagChange = (nodes: DriveSelectionItem[]) => {
    const nextFolder = nodes.find((node) => node.kind === 'folder');
    if (!nextFolder?.tagId) {
      setSelectedTag(null);
      resetPermissionForm();
      return;
    }
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      const nextTag = await resolveTagById(nextFolder.tagId!);
      if (!nextTag) {
        resetPermissionForm();
        return;
      }
      applyTagToForm(nextTag);
    };
    void fillFormByTag();
  };

  const { loading: saving, run: runSavePermission } = useRequest(
    async (values: TagPermissionFormValues) => {
      if (!selectedTag?.tagId) return;
      if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
      await tagService.updateTag({
        groupId,
        targetTagId: selectedTag.tagId,
        taggedResourceAclGrantScope: values.taggedResourceAclGrantScope,
        taggedResourceAclGrantSpecifiedUsers: values.taggedResourceAclGrantSpecifiedUsers,
        grantedActions: values.grantedActions,
        tagMountPermissionScope: values.tagMountPermissionScope,
        tagMountSpecifiedUsers: values.tagMountSpecifiedUsers,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!selectedTag?.tagId) {
      return;
    }
    runSavePermission(permissionForm);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      setSelectedTag(null);
      setInitialTagLoading(false);
      resetPermissionForm();
      onOpenChange(false);
    }
  };

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    setPermissionForm((prev) => ({
      ...prev,
      grantedActions: updateResourceActionSelection(prev.grantedActions, action, checked),
    }));
  };

  /**
   * 弹窗每次打开都需要重新读取目标标签权限；这里依赖 Overlay 打开时机，
   * 不能改成事件回调之外的请求，否则顶部入口选择标签与右栏直达标签会不同步。
   */
  useEffectForce(() => {
    if (!isOpen) return;
    handleModalShow();
  }, [isOpen]);

  const renderPermissionTable = () => {
    const actionSet = new Set(permissionForm.grantedActions);
    return (
      <div className={styles.permissionTableShell}>
        <table className={styles.permissionTable}>
          <thead>
            <tr>
              <th className={styles.actionHeader}>权限动作</th>
              <th className={styles.toggleHeader}>开启</th>
              {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => (
                <th key={strategy.key} className={styles.resourceApplicabilityHeader}>
                  {strategy.label}适用
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAG_PERMISSION_ACTION_ROWS.map((row) => {
              const selected = actionSet.has(row.action);
              return (
                <tr key={row.key}>
                  <th className={styles.actionCell}>
                    <span className={styles.actionName}>
                      <ResourcePermissionActionIcon
                        action={row.action}
                        className={styles.actionIcon}
                      />
                      <span className={styles.actionText}>{row.label}</span>
                    </span>
                  </th>
                  <td
                    className={styles.permissionToggleCell}
                    onClick={() => handleActionToggle(row.action, !selected)}
                  >
                    <Checkbox
                      aria-label={row.label}
                      isSelected={selected}
                      onChange={(checked) => handleActionToggle(row.action, checked)}
                      variant="secondary"
                      className={styles.permissionCheckbox}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox.Content className={styles.permissionCheckboxContent}>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </td>
                  {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => {
                    const supported = row.supportedStrategyKeys.includes(strategy.key);
                    const cellClassName = !supported
                      ? styles.unsupportedCell
                      : selected
                        ? styles.supportedCell
                        : styles.deniedCell;
                    return (
                      <td key={strategy.key} className={cellClassName}>
                        {!supported ? (
                          <span aria-hidden="true">-</span>
                        ) : selected ? (
                          <Check
                            size={14}
                            aria-label={`${strategy.label}${row.label}已开启`}
                            className={styles.permissionStateIcon}
                          />
                        ) : (
                          <X
                            size={14}
                            aria-label={`${strategy.label}${row.label}未开启`}
                            className={styles.permissionStateIcon}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="标签权限表格"
      size="lg"
      containerClassName={styles.modalContainer}
      dialogClassName={styles.modalDialog}
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={saving || !selectedTag || !groupId}
            aria-busy={saving || undefined}
            onPress={handleSubmit}
          >
            保存
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.wrapper}>
          {showTagTree ? (
            <div className={styles.leftPane}>
              <div className={styles.leftTitle}>选择标签</div>
              <DriveNav
                scope={groupId ? { type: 'group', groupId } : undefined}
                renderableTypes={['root', 'folder']}
                selectableTypes={['folder']}
                multiple={false}
                refreshTrigger={tagRefreshSeed}
                onChange={handleTagChange}
              />
            </div>
          ) : null}

          <div className={styles.rightPane}>
            {!selectedTag ? (
              <div className={styles.emptyState}>
                {showTagTree ? (
                  <Empty description="请选择一个标签" />
                ) : (
                  <Spin size="large" tip="加载标签权限中" />
                )}
              </div>
            ) : (
              <>
                <div className={styles.presetBar}>
                  <span className={styles.presetLabel}>基于预设</span>
                  <div className={styles.presetButtons} role="group" aria-label="基于预设">
                    {TAG_PERMISSION_ACTION_PRESET_OPTIONS.map((preset) => (
                      <Button
                        key={preset.key}
                        variant={selectedActionPresetKey === preset.key ? 'primary' : 'secondary'}
                        size="sm"
                        onPress={() => applyPresetToForm(preset.key)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <span className={styles.currentPreset}>
                    当前动作：
                    {TAG_PERMISSION_ACTION_PRESET_OPTIONS.find(
                      (preset) => preset.key === selectedActionPresetKey
                    )?.label ?? '自定义'}
                  </span>
                </div>
                {initialTagLoading ? (
                  <div className={styles.emptyState}>
                    <Spin size="large" tip="加载标签权限中" />
                  </div>
                ) : (
                  renderPermissionTable()
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
};

export default TagPermissionModal;

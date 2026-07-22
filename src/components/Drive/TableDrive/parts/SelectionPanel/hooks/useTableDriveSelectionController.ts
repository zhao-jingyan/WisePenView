import {
  isDriveActionTarget,
  isDriveSystemFolderNode,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import {
  buildResourceOverrideActions,
  getResourcePermissionPresetActions,
  getResourcePermissionPresetOption,
  resolveResourcePermissionPolicy,
  resolveTagInheritedResourceActions,
  RESOURCE_PERMISSION_PRESET_KEYS,
  type ResourcePermissionPresetKey,
} from '@/components/Drive/common/resourcePermissionPolicy';
import {
  getTagMountPermissionPresetOption,
  getTagPermissionPresetOption,
  resolveTagMountPermissionPresetKeyFromTag,
  resolveTagPermissionPresetKeyFromTag,
} from '@/components/Drive/common/tagPermissionPreset';
import { useResourceService, useTagService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import type {
  ResourceAction,
  ResourcePermissionOverview,
  ResourcePermissionResourceType,
} from '@/domains/Resource';
import {
  ACCESS_CONTROL_SCOPE,
  getTagPermissionPresetValues,
  type TagMountPermissionPresetKey,
  type TagPermissionPresetKey,
  type TagTreeNode,
} from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { resolveResourceKind } from '@/utils/navigation/resourceTarget';
import { toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useRef, useState } from 'react';
import type { TableDriveSelectionPanelProps } from '../index.type';

interface ResourcePermissionPanelData {
  overview: ResourcePermissionOverview;
  inheritedActions: ResourceAction[];
}

type UseTableDriveSelectionControllerOptions = Pick<
  TableDriveSelectionPanelProps,
  | 'selectedRow'
  | 'selectedCount'
  | 'mode'
  | 'groupId'
  | 'canManageTagPermission'
  | 'tagPermissionRefreshToken'
  | 'resourcePermissionRefreshToken'
  | 'onManageTagAccessPermission'
  | 'onManageTagMountPermission'
  | 'onManageResourcePermission'
  | 'onTagPermissionChange'
>;

function toActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function formatTagMountPermissionSummary(
  presetKey: TagMountPermissionPresetKey,
  presetOption: ReturnType<typeof getTagMountPermissionPresetOption>,
  tag: TagTreeNode | undefined
): string {
  if (presetKey !== 'advanced') {
    return `${presetOption.label}：${presetOption.description}`;
  }
  const scope =
    tag?.tagMountPermissionScope === ACCESS_CONTROL_SCOPE.BLACKLIST ? '黑名单' : '白名单';
  const count = tag?.tagMountSpecifiedUsers?.length ?? 0;
  return `${presetOption.label}：${scope} ${count} 人`;
}

export function useTableDriveSelectionController({
  selectedRow,
  selectedCount = 0,
  mode = 'drive',
  groupId,
  canManageTagPermission = false,
  tagPermissionRefreshToken,
  resourcePermissionRefreshToken,
  onManageTagAccessPermission,
  onManageTagMountPermission,
  onManageResourcePermission,
  onTagPermissionChange,
}: UseTableDriveSelectionControllerOptions) {
  const tagService = useTagService();
  const resourceService = useResourceService();
  const savingPresetKeyRef = useRef<TagPermissionPresetKey | null>(null);
  const savingResourcePresetKeyRef = useRef<ResourcePermissionPresetKey | null>(null);
  const [optimisticPresetSelection, setOptimisticPresetSelection] = useState<{
    tagId: string;
    key: TagPermissionPresetKey;
    refreshToken: number;
  } | null>(null);
  const [optimisticResourcePresetSelection, setOptimisticResourcePresetSelection] = useState<{
    resourceId: string;
    key: ResourcePermissionPresetKey;
    refreshToken: number;
  } | null>(null);

  const isFavoriteMode = mode === 'favorite';
  const node = selectedRow?.node;
  const actionTarget = node ? toActionTarget(node) : null;
  const isFolder = node?.type === 'folder';
  const isFile = node?.type === 'resource' || node?.type === 'link';
  const canModifyActionTarget = actionTarget != null && !isDriveSystemFolderNode(actionTarget);
  const canRename =
    !isFavoriteMode &&
    actionTarget != null &&
    !isDriveSystemFolderNode(actionTarget) &&
    actionTarget.type !== 'link';
  const folderTagId = node?.type === 'folder' ? node.tagId : undefined;
  const resourceId = node?.type === 'resource' ? node.resourceId : undefined;
  const resourceFallbackTagId = node?.type === 'resource' ? node.folderTagId : undefined;
  const resourcePermissionResourceType =
    node?.type === 'resource'
      ? (resolveResourceKind({
          resourceType: node.resourceType,
          resourceName: selectedRow?.name,
        }) as ResourcePermissionResourceType)
      : undefined;
  const canShowTagPermission = Boolean(
    !isFavoriteMode && canManageTagPermission && groupId && folderTagId && selectedCount <= 1
  );
  const canShowResourcePermission = Boolean(
    canManageTagPermission &&
    !isFavoriteMode &&
    groupId &&
    resourceId &&
    resourcePermissionResourceType &&
    selectedCount <= 1
  );
  const {
    data: selectedTag,
    loading: tagPermissionLoading,
    mutate: mutateSelectedTag,
  } = useRequest(
    async (): Promise<TagTreeNode | undefined> => {
      if (!folderTagId || !groupId) return undefined;
      let tag = tagService.getRawTagById(folderTagId, groupId);
      if (!tag) {
        await tagService.getRawTagTree(groupId);
        tag = tagService.getRawTagById(folderTagId, groupId);
      }
      return tag;
    },
    {
      ready: canShowTagPermission,
      refreshDeps: [folderTagId, groupId, tagPermissionRefreshToken],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const {
    data: resourcePermissionData,
    loading: resourcePermissionLoading,
    error: resourcePermissionError,
    refresh: refreshResourcePermission,
  } = useRequest(
    async (): Promise<ResourcePermissionPanelData | undefined> => {
      if (!resourceId || !resourcePermissionResourceType || !groupId) return undefined;

      const overview = await resourceService.getResourcePermissionOverview({
        resourceId,
        resourceType: resourcePermissionResourceType,
      });
      const initialPolicy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: resourceFallbackTagId,
        resourceType: resourcePermissionResourceType,
      });
      const tagId = initialPolicy.primaryTagId ?? resourceFallbackTagId;
      let inheritedActions = initialPolicy.inheritedActions;

      if (tagId) {
        let tag = tagService.getRawTagById(tagId, groupId);
        if (!tag) {
          await tagService.getRawTagTree(groupId);
          tag = tagService.getRawTagById(tagId, groupId);
        }
        inheritedActions = resolveTagInheritedResourceActions(tag, overview.supportedActions);
      }

      return { overview, inheritedActions };
    },
    {
      ready: canShowResourcePermission,
      refreshDeps: [
        resourceId,
        resourcePermissionResourceType,
        resourceFallbackTagId,
        groupId,
        resourcePermissionRefreshToken,
      ],
      onSuccess: () => setOptimisticResourcePresetSelection(null),
      onError: (error) => {
        setOptimisticResourcePresetSelection(null);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const resolvedPresetKey = resolveTagPermissionPresetKeyFromTag(selectedTag);
  const resolvedMountPresetKey = resolveTagMountPermissionPresetKeyFromTag(selectedTag);
  const optimisticPresetKey =
    optimisticPresetSelection &&
    optimisticPresetSelection.tagId === folderTagId &&
    optimisticPresetSelection.refreshToken === (tagPermissionRefreshToken ?? 0)
      ? optimisticPresetSelection.key
      : undefined;
  const selectedPresetKey = optimisticPresetKey ?? resolvedPresetKey;
  const selectedPresetOption = getTagPermissionPresetOption(selectedPresetKey);
  const selectedPresetListKeys = new Set([selectedPresetKey]);
  const selectedMountPresetOption = getTagMountPermissionPresetOption(resolvedMountPresetKey);
  const selectedMountPresetSummary = formatTagMountPermissionSummary(
    resolvedMountPresetKey,
    selectedMountPresetOption,
    selectedTag
  );
  const resourcePermissionPolicy = resolveResourcePermissionPolicy({
    overview: resourcePermissionData?.overview,
    groupId,
    fallbackTagId: resourceFallbackTagId,
    inheritedActions: resourcePermissionData?.inheritedActions,
    resourceType: resourcePermissionResourceType,
  });
  const optimisticResourcePresetKey =
    optimisticResourcePresetSelection &&
    optimisticResourcePresetSelection.resourceId === resourceId &&
    optimisticResourcePresetSelection.refreshToken === (resourcePermissionRefreshToken ?? 0)
      ? optimisticResourcePresetSelection.key
      : undefined;
  const selectedResourcePresetKey =
    optimisticResourcePresetKey ?? resourcePermissionPolicy.selectedKey;
  const selectedResourcePresetOption = getResourcePermissionPresetOption(selectedResourcePresetKey);
  const selectedResourcePresetListKeys = new Set([selectedResourcePresetKey]);
  const disabledResourcePresetKeys =
    resourcePermissionLoading || resourcePermissionError ? RESOURCE_PERMISSION_PRESET_KEYS : [];

  const persistPresetKey = useCallback(
    async (presetKey: TagPermissionPresetKey): Promise<boolean> => {
      if (!folderTagId || !groupId) return false;
      const presetValues = getTagPermissionPresetValues(presetKey);
      if (!presetValues) return false;

      try {
        setOptimisticPresetSelection({
          tagId: folderTagId,
          key: presetKey,
          refreshToken: tagPermissionRefreshToken ?? 0,
        });
        savingPresetKeyRef.current = presetKey;
        await tagService.updateTag({
          groupId,
          targetTagId: folderTagId,
          taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: [],
          grantedActions: presetValues.grantedActions,
        });
        mutateSelectedTag((previous) => ({
          ...(previous ?? {
            tagId: folderTagId,
            tagName: selectedRow?.name ?? '',
            groupId,
          }),
          taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: [],
          grantedActions: presetValues.grantedActions,
        }));
        setOptimisticPresetSelection(null);
        onTagPermissionChange?.();
        toast.success('访问策略已保存');
        return true;
      } catch (error) {
        setOptimisticPresetSelection(null);
        toast.danger(parseErrorMessage(error));
        return false;
      } finally {
        savingPresetKeyRef.current = null;
      }
    },
    [
      folderTagId,
      groupId,
      mutateSelectedTag,
      onTagPermissionChange,
      selectedRow?.name,
      tagPermissionRefreshToken,
      tagService,
    ]
  );

  const handlePresetSelect = (presetKey: TagPermissionPresetKey) => {
    if (!folderTagId || !groupId || savingPresetKeyRef.current) return;
    if (presetKey === 'custom') {
      onManageTagAccessPermission?.(folderTagId);
      return;
    }
    if (presetKey === selectedPresetKey) return;
    void persistPresetKey(presetKey);
  };

  const handlePresetSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const [key] = [...keys];
    if (key == null) return;
    void handlePresetSelect(String(key) as TagPermissionPresetKey);
  };

  const handleMountConfigPress = () => {
    if (!folderTagId || !groupId) return;
    onManageTagMountPermission?.(folderTagId);
  };

  const handleResourcePresetSelect = async (presetKey: ResourcePermissionPresetKey) => {
    if (!resourceId || !groupId || !resourcePermissionResourceType) return;
    if (savingResourcePresetKeyRef.current) return;

    if (presetKey === 'custom') {
      onManageResourcePermission?.({
        resourceId,
        resourceType: resourcePermissionResourceType,
        resourceName: selectedRow?.name,
        fallbackTagId: resourcePermissionPolicy.primaryTagId ?? resourceFallbackTagId,
      });
      return;
    }

    if (presetKey === selectedResourcePresetKey) return;

    const presetActions =
      presetKey === 'inherit'
        ? resourcePermissionPolicy.inheritedActions
        : getResourcePermissionPresetActions(presetKey, resourcePermissionPolicy.supportedActions);
    if (!presetActions) return;

    const overrideActions =
      presetKey === 'inherit'
        ? null
        : buildResourceOverrideActions(
            presetActions,
            resourcePermissionPolicy.inheritedActions,
            resourcePermissionPolicy.supportedActions
          );

    try {
      setOptimisticResourcePresetSelection({
        resourceId,
        key: presetKey,
        refreshToken: resourcePermissionRefreshToken ?? 0,
      });
      savingResourcePresetKeyRef.current = presetKey;
      await resourceService.updateResourceActionPermission({
        resourceId,
        overrideGrantedActions: {
          [groupId]: overrideActions,
        },
      });
      toast.success('资源权限已保存');
      refreshResourcePermission();
    } catch (error) {
      setOptimisticResourcePresetSelection(null);
      toast.danger(parseErrorMessage(error));
    } finally {
      savingResourcePresetKeyRef.current = null;
    }
  };

  const handleResourcePresetSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const [key] = [...keys];
    if (key == null) return;
    void handleResourcePresetSelect(String(key) as ResourcePermissionPresetKey);
  };

  return {
    node,
    actionTarget,
    isFavoriteMode,
    isFolder,
    isFile,
    canModifyActionTarget,
    canRename,
    canShowTagPermission,
    canShowResourcePermission,
    tagPermissionLoading,
    selectedPresetKey,
    selectedPresetOption,
    selectedPresetListKeys,
    selectedMountPresetSummary,
    resourcePermissionLoading,
    resourcePermissionError,
    resourcePermissionPolicy,
    selectedResourcePresetKey,
    selectedResourcePresetOption,
    selectedResourcePresetListKeys,
    disabledResourcePresetKeys,
    onPresetSelect: handlePresetSelect,
    onPresetSelectionChange: handlePresetSelectionChange,
    onMountConfigPress: handleMountConfigPress,
    onResourcePresetSelect: handleResourcePresetSelect,
    onResourcePresetSelectionChange: handleResourcePresetSelectionChange,
  };
}

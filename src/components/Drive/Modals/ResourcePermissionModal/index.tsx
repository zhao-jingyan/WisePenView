import {
  buildResourceOverrideActions,
  buildResourcePermissionActionKeySet,
  buildResourcePermissionActionOptions,
  readResourcePermissionActionsFromKeys,
  resolveResourcePermissionPolicy,
  resolveTagInheritedResourceActions,
} from '@/components/Drive/common/resourcePermissionPolicy';
import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import { useResourceService, useTagService } from '@/domains';
import {
  areResourcePermissionActionsEqual,
  type ResourceAction,
  type ResourcePermissionOverview,
} from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { ResourcePermissionModalProps } from './index.type';
import styles from './style.module.less';

interface ResourcePermissionModalData {
  overview: ResourcePermissionOverview;
  policy: ReturnType<typeof resolveResourcePermissionPolicy>;
}

const toStringKeySet = (keys: Selection): Set<string> => {
  if (keys === 'all') return new Set();
  return new Set([...keys].map((key) => String(key)));
};

function ResourcePermissionModal({
  isOpen,
  groupId,
  target,
  onOpenChange,
  onSuccess,
}: ResourcePermissionModalProps) {
  const resourceService = useResourceService();
  const tagService = useTagService();
  const [selectedActions, setSelectedActions] = useState<ResourceAction[]>([]);

  const {
    data,
    loading,
    error,
    refresh: refreshPermission,
  } = useRequest(
    async (): Promise<ResourcePermissionModalData> => {
      if (!target || !groupId) {
        throw new Error('缺少资源权限上下文');
      }

      const overview = await resourceService.getResourcePermissionOverview({
        resourceId: target.resourceId,
        resourceType: target.resourceType,
      });
      const initialPolicy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
        resourceType: target.resourceType,
      });
      const tagId = initialPolicy.primaryTagId;
      let inheritedActions = initialPolicy.inheritedActions;

      if (tagId) {
        let tag = tagService.getRawTagById(tagId, groupId);
        if (!tag) {
          await tagService.getRawTagTree(groupId);
          tag = tagService.getRawTagById(tagId, groupId);
        }
        inheritedActions = resolveTagInheritedResourceActions(tag, overview.supportedActions);
      }

      const policy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
        inheritedActions,
        resourceType: target.resourceType,
      });

      return { overview, policy };
    },
    {
      ready: Boolean(isOpen && target && groupId),
      refreshDeps: [
        isOpen,
        target?.resourceId,
        target?.resourceType,
        target?.fallbackTagId,
        groupId,
      ],
      onSuccess: ({ policy }) => {
        setSelectedActions(policy.activeActions);
      },
    }
  );

  const policy = data?.policy;
  const actionOptions = data?.overview.actionOptions.length
    ? data.overview.actionOptions
    : buildResourcePermissionActionOptions(policy?.supportedActions ?? []);
  const selectedActionKeys = buildResourcePermissionActionKeySet(selectedActions, actionOptions);
  const draftInconsistent = Boolean(
    policy &&
    !areResourcePermissionActionsEqual(
      selectedActions,
      policy.inheritedActions,
      policy.supportedActions
    )
  );

  const { loading: saving, run: runSave } = useRequest(
    async () => {
      if (!target || !groupId || !policy) return;
      const overrideActions = buildResourceOverrideActions(
        selectedActions,
        policy.inheritedActions,
        policy.supportedActions
      );
      await resourceService.updateResourceActionPermission({
        resourceId: target.resourceId,
        overrideGrantedActions: {
          [groupId]: overrideActions,
        },
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
        refreshPermission();
      },
    }
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      setSelectedActions([]);
      onOpenChange(false);
    }
  };

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') {
      setSelectedActions(actionOptions.map((option) => option.action));
      return;
    }
    setSelectedActions(readResourcePermissionActionsFromKeys(toStringKeySet(keys), actionOptions));
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="资源权限"
      description={target?.resourceName}
      size="md"
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={saving || loading || Boolean(error) || !policy}
            aria-busy={saving || undefined}
            onPress={() => runSave()}
          >
            保存
          </Button>
        </>
      }
    >
      {loading ? (
        <div className={styles.state} aria-busy="true">
          <Spin size="large" tip="加载资源权限中" />
        </div>
      ) : error ? (
        <div className={styles.state}>{parseErrorMessage(error)}</div>
      ) : policy ? (
        <div className={styles.content}>
          <div className={draftInconsistent ? styles.warning : styles.inheritHint}>
            {draftInconsistent
              ? '与标签权限不一致，保存后仅对此资源生效。'
              : '当前选择与标签权限一致，将继续继承标签策略。'}
          </div>
          <ListBox
            aria-label="资源权限动作"
            selectionMode="multiple"
            selectedKeys={selectedActionKeys}
            onSelectionChange={handleSelectionChange}
            className={styles.actionList}
          >
            {actionOptions.map((option) => (
              <ListBox.Item id={option.key} key={option.key} textValue={option.label}>
                <span className={styles.actionLabel}>{option.label}</span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </div>
      ) : (
        <div className={styles.state}>暂无资源权限配置</div>
      )}
    </AppModal>
  );
}

export default ResourcePermissionModal;

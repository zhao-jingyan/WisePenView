import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import { Checkbox, Input, TextArea } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useGroupService, useImageService } from '@/domains';
import type { EditGroupRequest, GroupResConfig } from '@/domains/Group';
import { DEFAULT_MEMBER_ACTIONS, GROUP_TYPE } from '@/domains/Group';
import {
  getResourceActionImpliedActions,
  normalizeResourceActions,
  TAG_RESOURCE_ACTION,
  type TagResourceAction,
  updateResourceActionSelection,
} from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';
import { Button, Label, TextField, toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { useState } from 'react';
import type { EditGroupInfoModalProps } from './index.type';

import styles from './index.module.less';

/** 编辑小组表单值（含封面上传） */
type EditGroupFormValues = Pick<EditGroupRequest, 'groupName' | 'groupDesc'> & {
  cover?: File | null;
  defaultMemberActions?: TagResourceAction[];
};

const buildInitialConfig = (
  config?: GroupResConfig
): Pick<EditGroupFormValues, 'defaultMemberActions'> => ({
  defaultMemberActions: config
    ? normalizeResourceActions(config.defaultMemberActions)
    : DEFAULT_MEMBER_ACTIONS,
});

const buildInitialFormValues = ({
  groupName,
  description,
  config,
}: {
  groupName: string;
  description: string;
  config?: GroupResConfig;
}): EditGroupFormValues => ({
  groupName,
  groupDesc: description,
  cover: null,
  ...buildInitialConfig(config),
});

function EditGroupInfoModal({
  open,
  onCancel,
  groupId,
  groupName = '',
  description = '',
  cover,
  groupType = GROUP_TYPE.NORMAL,
  onSuccess,
}: EditGroupInfoModalProps) {
  const groupService = useGroupService();
  const imageService = useImageService();
  const [formValues, setFormValues] = useState<EditGroupFormValues>(() =>
    buildInitialFormValues({
      groupName,
      description,
      config: undefined,
    })
  );
  const [hoveredAction, setHoveredAction] = useState<TagResourceAction | null>(null);

  const {
    loading: configLoading,
    data: groupResConfig,
    run: runFetchGroupResConfig,
  } = useRequest(
    async (targetGroupId: string): Promise<GroupResConfig> =>
      groupService.fetchGroupResConfig(targetGroupId),
    {
      manual: true,
      onSuccess: (config) => {
        setFormValues((prev) => ({
          ...prev,
          ...buildInitialConfig(config),
        }));
      },
      onError: (error: unknown) => {
        setFormValues((prev) => ({
          ...prev,
          ...buildInitialConfig(),
        }));
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const { loading, run: runEditGroup } = useRequest(
    async (formValues: EditGroupFormValues) => {
      if (!groupId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
      }
      let groupCoverUrl = cover ?? '';
      if (formValues.cover) {
        const { publicUrl } = await imageService.uploadImage({
          file: formValues.cover,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${groupId}`,
        });
        groupCoverUrl = publicUrl;
      }
      const params: EditGroupRequest = {
        groupId,
        groupName: formValues.groupName,
        groupDesc: formValues.groupDesc,
        groupCoverUrl,
        groupType,
      };
      await groupService.editGroup(params);
      await groupService.updateGroupResConfig({
        groupId,
        defaultMemberActions: normalizeResourceActions(
          formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
        ),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('小组信息已更新');
        setFormValues(buildInitialFormValues({ groupName, description, config: groupResConfig }));
        onSuccess?.();
        onCancel();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const updateFormValue = <K extends keyof EditGroupFormValues>(
    key: K,
    value: EditGroupFormValues[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCoverChange = (file: File | null) => {
    if (!file) {
      updateFormValue('cover', null);
      return;
    }
    try {
      assertImageProxyUploadLimit(file);
      updateFormValue('cover', file);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormValues(buildInitialFormValues({ groupName, description, config: groupResConfig }));
    setHoveredAction(null);
  };

  const initForm = () => {
    setFormValues(buildInitialFormValues({ groupName, description, config: undefined }));
    if (groupId) {
      runFetchGroupResConfig(groupId);
    }
  };

  const handleConfirm = () => {
    if (!groupId) {
      toast.danger('小组ID不存在');
      return;
    }
    if (!formValues.groupName.trim()) {
      toast.warning('请输入小组名称');
      return;
    }
    const trimmedName = formValues.groupName.trim();
    const trimmedDesc = formValues.groupDesc?.trim() ?? '';
    runEditGroup({
      ...formValues,
      groupName: trimmedName,
      groupDesc: trimmedDesc,
    });
  };

  useMount(() => {
    if (open) {
      initForm();
    }
  });

  useUpdateEffect(() => {
    if (open) {
      initForm();
      return;
    }
    setHoveredAction(null);
  }, [open]);

  const selectedActions = normalizeResourceActions(
    formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
  );
  const selectedActionSet = new Set(selectedActions);
  const actionHighlightSet = hoveredAction
    ? new Set([hoveredAction, ...getResourceActionImpliedActions(hoveredAction)])
    : null;

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    const current = normalizeResourceActions(
      formValues.defaultMemberActions ?? DEFAULT_MEMBER_ACTIONS
    );
    updateFormValue(
      'defaultMemberActions',
      updateResourceActionSelection(current, action, checked)
    );
  };

  return (
    <AppModal
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onCancel();
        }
      }}
      title="编辑小组信息"
      size="md"
      bodyClassName={styles.modalBody}
      isDismissable={!loading}
      actions={
        <>
          <Button
            variant="secondary"
            isDisabled={loading}
            onPress={() => {
              resetForm();
              onCancel();
            }}
          >
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={loading || configLoading}
            aria-busy={loading || configLoading || undefined}
            onPress={handleConfirm}
          >
            确定
          </Button>
        </>
      }
    >
      <TextField
        aria-label="小组名称"
        value={formValues.groupName}
        onChange={(value) => updateFormValue('groupName', value)}
        isRequired
      >
        <Label>小组名称</Label>
        <Input placeholder="请输入小组名称" />
      </TextField>
      <TextField
        aria-label="小组描述"
        value={formValues.groupDesc}
        onChange={(value) => updateFormValue('groupDesc', value)}
      >
        <Label>小组描述</Label>
        <TextArea rows={4} placeholder="请输入小组描述（可选）" />
      </TextField>
      <div className={styles.coverField}>
        <span className={styles.fieldLabel}>封面图片</span>
        <UploadZone
          file={formValues.cover ?? null}
          disabled={loading}
          accept="image/*"
          label="点击或拖拽封面图片到此区域"
          description={`仅可选择单张图片，大小不超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`}
          onFileChange={handleCoverChange}
        />
      </div>
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>小组成员默认权限</div>
        <div className={styles.actionGroup}>新成员默认可用的资源权限</div>
        <div className={styles.actionList}>
          {TAG_RESOURCE_ACTION.options.map((item) => {
            const action = item.value as TagResourceAction;
            const isHighlighted = actionHighlightSet?.has(action);
            return (
              <div
                key={item.key}
                className={
                  isHighlighted
                    ? `${styles.actionItem} ${styles.actionItemHighlight}`
                    : styles.actionItem
                }
                onMouseEnter={() => setHoveredAction(action)}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <Checkbox
                  isSelected={selectedActionSet.has(action)}
                  onChange={(isSelected) => handleActionToggle(action, isSelected)}
                >
                  <span data-slot="label" className={styles.actionLabel}>
                    <ResourcePermissionActionIcon action={action} className={styles.actionIcon} />
                    <span className={styles.actionText}>{item.label}</span>
                  </span>
                </Checkbox>
              </div>
            );
          })}
        </div>
      </div>
    </AppModal>
  );
}

export default EditGroupInfoModal;

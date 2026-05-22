import DriveNav from '@/components/Drive/DriveNav';
import { useDriveService, useGroupService, useTagService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import type { GroupMember } from '@/domains/Group';
import {
  actionsToPermissionCode,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  TAG_ACL_GRANT_MODE,
  TAG_RESOURCE_ACTION,
  TAG_RESOURCE_MOUNT_MODE,
  type TagAclGrantMode,
  type TagResourceAction,
  type TagResourceMountMode,
} from '@/domains/Tag';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error/parseErrorMessage';
import { useRequest } from 'ahooks';
import { Button, Checkbox, Empty, Form, Modal, Radio, Select } from 'antd';
import { useState } from 'react';
import { DEFAULT_DRIVE_ROOT_ID, type DriveSelectionItem } from '../../common/driveComponentModel';
import type { TagPermissionModalProps } from './index.type';
import styles from './style.module.less';

type TagPermissionFormValues = {
  aclGrantMode?: TagAclGrantMode;
  aclGrantSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
  resourceMountMode?: TagResourceMountMode;
  resourceMountSpecifiedUsers?: string[];
};

const MEMBER_PAGE_SIZE = 200;

const isAclUserListMode = (mode?: TagAclGrantMode) =>
  mode === TAG_ACL_GRANT_MODE.WHITELIST || mode === TAG_ACL_GRANT_MODE.BLACKLIST;

const isMountUserListMode = (mode?: TagResourceMountMode) =>
  mode === TAG_RESOURCE_MOUNT_MODE.WHITELIST || mode === TAG_RESOURCE_MOUNT_MODE.BLACKLIST;

const getSelectableMembers = (members?: GroupMember[]) =>
  (members ?? []).filter((m) => m.role !== 'ADMIN' && m.role !== 'OWNER');

const buildSelectableMemberIdSet = (members: GroupMember[]) =>
  new Set(members.map((m) => m.userId));

const buildMemberOptions = (members: GroupMember[]) =>
  members.map((member) => {
    const nickname = member.nickname?.trim();
    const realname = member.realname?.trim();
    const label = nickname && realname ? `${nickname} (${realname})` : nickname || realname;
    return { label, value: member.userId };
  });

const getActionLabel = (action: TagResourceAction) =>
  TAG_RESOURCE_ACTION.labels[action] ?? String(action);

const filterSelectableUserIds = (ids: string[] | undefined, selectableMemberIdSet: Set<string>) => {
  if (!ids || ids.length === 0) return [];
  if (selectableMemberIdSet.size === 0) return ids;
  return ids.filter((id) => selectableMemberIdSet.has(id));
};

async function findFolderNodeIdByTagId(params: {
  rootId: string;
  groupId?: string;
  tagId: string;
  loadNodeChildren: (nodeId: string, groupId?: string) => Promise<DriveNode[]>;
}): Promise<string | undefined> {
  const { rootId, groupId, tagId, loadNodeChildren } = params;
  const queue: string[] = [rootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);

    const children = await loadNodeChildren(currentId, groupId);
    for (const child of children) {
      if (child.type !== 'folder') continue;
      if (child.tagId === tagId) return child.id;
      queue.push(child.id);
    }
  }

  return undefined;
}

const TagPermissionModal = ({
  open,
  groupId,
  initialTagId,
  onCancel,
  onSuccess,
}: TagPermissionModalProps) => {
  const tagService = useTagService();
  const driveService = useDriveService();
  const groupService = useGroupService();
  const message = useAppMessage();
  const [form] = Form.useForm<TagPermissionFormValues>();
  const [selectedTag, setSelectedTag] = useState<DriveSelectionItem | null>(null);
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [tagInitialIds, setTagInitialIds] = useState<string[] | undefined>(undefined);
  const [hoveredAction, setHoveredAction] = useState<TagResourceAction | null>(null);
  const watchedGrantedActions = Form.useWatch('grantedActions', form);

  const { run: runResolveInitialNode } = useRequest(
    async (tagId: string): Promise<string[] | undefined> => {
      const nodeId = await findFolderNodeIdByTagId({
        rootId: DEFAULT_DRIVE_ROOT_ID,
        groupId,
        tagId,
        loadNodeChildren: (nodeId, currentGroupId) =>
          driveService.loadNodeChildren({ nodeId, groupId: currentGroupId }),
      });
      return nodeId ? [nodeId] : undefined;
    },
    {
      manual: true,
      onSuccess: (ids) => {
        setTagInitialIds(ids);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err));
        setTagInitialIds(undefined);
      },
    }
  );

  const {
    data: members,
    loading: membersLoading,
    run: runFetchMembers,
  } = useRequest(
    async (): Promise<GroupMember[]> => {
      if (!groupId) return [];
      const allMembers: GroupMember[] = [];
      let page = 1;
      let total = 0;
      do {
        const { members: pageMembers, total: nextTotal } = await groupService.fetchGroupMembers(
          groupId,
          page,
          MEMBER_PAGE_SIZE
        );
        allMembers.push(...pageMembers);
        total = nextTotal;
        page += 1;
      } while (allMembers.length < total);
      return allMembers;
    },
    {
      manual: true,
      onError: (err) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const selectableMembers = getSelectableMembers(members);
  const selectableMemberIdSet = buildSelectableMemberIdSet(selectableMembers);
  const memberOptions = buildMemberOptions(selectableMembers);
  const actionHighlightSet = hoveredAction
    ? new Set([hoveredAction, ...getResourceActionImpliedActions(hoveredAction)])
    : null;

  const handleOpenChange = (visible: boolean) => {
    if (!visible) {
      setSelectedTag(null);
      setTagInitialIds(undefined);
      form.resetFields();
      return;
    }
    setSelectedTag(null);
    form.resetFields();
    setTagRefreshSeed((prev) => prev + 1);
    setTagInitialIds(undefined);
    if (initialTagId) {
      runResolveInitialNode(initialTagId);
    }
    if (groupId) {
      runFetchMembers();
    }
  };

  const handleTagChange = (nodes: DriveSelectionItem[]) => {
    const nextFolder = nodes.find((node) => node.kind === 'folder');
    if (!nextFolder) {
      setSelectedTag(null);
      form.resetFields();
      return;
    }
    if (!nextFolder.tagId) {
      setSelectedTag(null);
      form.resetFields();
      return;
    }
    const selectedTagId = nextFolder.tagId;
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      let nextTag = tagService.getTagById(selectedTagId, groupId);
      if (!nextTag) {
        await tagService.getTagTree(groupId);
        nextTag = tagService.getTagById(selectedTagId, groupId);
      }
      if (!nextTag) {
        form.resetFields();
        return;
      }
      form.setFieldsValue({
        aclGrantMode: nextTag.aclGrantMode ?? TAG_ACL_GRANT_MODE.ALL,
        aclGrantSpecifiedUsers: filterSelectableUserIds(
          nextTag.aclGrantSpecifiedUsers,
          selectableMemberIdSet
        ),
        grantedActions: normalizeResourceActions(nextTag.grantedActions),
        resourceMountMode: nextTag.resourceMountMode ?? TAG_RESOURCE_MOUNT_MODE.ALL,
        resourceMountSpecifiedUsers: filterSelectableUserIds(
          nextTag.resourceMountSpecifiedUsers,
          selectableMemberIdSet
        ),
      });
    };
    void fillFormByTag();
  };

  const { loading: saving, run: runSavePermission } = useRequest(
    async (values: TagPermissionFormValues) => {
      if (!selectedTag?.tagId) return;
      if (!groupId) throw new Error('小组ID不存在');
      const aclGrantMode = values.aclGrantMode ?? TAG_ACL_GRANT_MODE.ALL;
      const resourceMountMode = values.resourceMountMode ?? TAG_RESOURCE_MOUNT_MODE.ALL;
      await tagService.updateTag({
        groupId,
        targetTagId: selectedTag.tagId,
        aclGrantMode,
        aclGrantSpecifiedUsers: filterSelectableUserIds(
          values.aclGrantSpecifiedUsers,
          selectableMemberIdSet
        ),
        grantedActions: normalizeResourceActions(values.grantedActions),
        resourceMountMode,
        resourceMountSpecifiedUsers: filterSelectableUserIds(
          values.resourceMountSpecifiedUsers,
          selectableMemberIdSet
        ),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success('标签权限已更新');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = async () => {
    if (!selectedTag?.tagId) {
      message.warning('请先选择标签');
      return;
    }
    const formValues = await form.validateFields();
    runSavePermission(formValues);
  };

  const handleCancel = () => {
    onCancel();
  };

  const selectedActions = normalizeResourceActions(watchedGrantedActions);
  const selectedActionSet = new Set(selectedActions);

  const handleActionToggle = (action: TagResourceAction, checked: boolean) => {
    const current = (form.getFieldValue('grantedActions') ?? []) as TagResourceAction[];
    if (checked) {
      const nextCode = actionsToPermissionCode([...current, action]);
      form.setFieldValue('grantedActions', permissionCodeToActions(nextCode));
      return;
    }
    const next = normalizeResourceActions(
      current.filter((item) => !hasResourceAction(getResourceActionImpliedMask(item), action))
    );
    form.setFieldValue('grantedActions', next);
  };

  return (
    <Modal
      title="标签权限管理"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      wrapClassName={styles.modalWrap}
      width={860}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={saving}
          disabled={!selectedTag || !groupId}
        >
          保存
        </Button>,
      ]}
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.wrapper}>
          <div className={styles.leftPane}>
            <div className={styles.leftTitle}>选择标签</div>
            <DriveNav
              scope={groupId ? { type: 'group', groupId } : undefined}
              renderableTypes={['folder']}
              selectableTypes={['folder']}
              multiple={false}
              refreshTrigger={tagRefreshSeed}
              initialSelectedIds={tagInitialIds}
              onChange={handleTagChange}
            />
          </div>

          <div className={styles.rightPane}>
            <Form form={form} layout="vertical">
              {!selectedTag ? (
                <div className={styles.emptyState}>
                  <Empty description="请选择一个标签" />
                </div>
              ) : (
                <>
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionTitle}>访问权限下发模式</div>
                    <Form.Item name="aclGrantMode" className={styles.modeRow}>
                      <Radio.Group
                        options={TAG_ACL_GRANT_MODE.options.map((item) => ({
                          label: item.label,
                          value: item.value,
                        }))}
                        optionType="button"
                        buttonStyle="solid"
                      />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, next) => prev.aclGrantMode !== next.aclGrantMode}
                    >
                      {({ getFieldValue }) =>
                        isAclUserListMode(getFieldValue('aclGrantMode')) ? (
                          <Form.Item
                            name="aclGrantSpecifiedUsers"
                            label={
                              <span className={styles.selectHint}>选择用户（不含管理员）</span>
                            }
                          >
                            <Select
                              mode="multiple"
                              options={memberOptions}
                              loading={membersLoading}
                              placeholder="请选择用户"
                              optionFilterProp="label"
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>

                    <Form.Item label="访问权限" className={styles.actionGroup}>
                      <Form.Item name="grantedActions" hidden>
                        <Select mode="multiple" options={[]} />
                      </Form.Item>
                      <div className={styles.actionList}>
                        {TAG_RESOURCE_ACTION.options.map((item) => {
                          const action = item.value as TagResourceAction;
                          const impliedActions = getResourceActionImpliedActions(action);
                          const impliedLabels = impliedActions
                            .map((value) => getActionLabel(value))
                            .filter(Boolean);
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
                                checked={selectedActionSet.has(action)}
                                onChange={(event) =>
                                  handleActionToggle(action, event.target.checked)
                                }
                              >
                                <span className={styles.actionLabel}>{item.label}</span>
                              </Checkbox>
                              {impliedLabels.length > 0 ? (
                                <div className={styles.actionHint}>
                                  包含：{impliedLabels.join(' / ')}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </Form.Item>
                  </div>

                  <div className={styles.sectionCard}>
                    <div className={styles.sectionTitle}>资源挂载权限</div>
                    <Form.Item name="resourceMountMode" className={styles.modeRow}>
                      <Radio.Group
                        options={TAG_RESOURCE_MOUNT_MODE.options.map((item) => ({
                          label: item.label,
                          value: item.value,
                        }))}
                        optionType="button"
                        buttonStyle="solid"
                      />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, next) =>
                        prev.resourceMountMode !== next.resourceMountMode
                      }
                    >
                      {({ getFieldValue }) =>
                        isMountUserListMode(getFieldValue('resourceMountMode')) ? (
                          <Form.Item
                            name="resourceMountSpecifiedUsers"
                            label={
                              <span className={styles.selectHint}>选择用户（不含管理员）</span>
                            }
                          >
                            <Select
                              mode="multiple"
                              options={memberOptions}
                              loading={membersLoading}
                              placeholder="请选择用户"
                              optionFilterProp="label"
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                  </div>
                </>
              )}
            </Form>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TagPermissionModal;

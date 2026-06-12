import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useGroupService } from '@/domains';
import { ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Select } from 'antd';
import { useState } from 'react';
import type { EditPermissionModalProps } from './index.type';
import styles from './style.module.less';
import { useMemberEditGuard } from './useMemberEditGuard';

const { Option } = Select;

function EditPermissionModal({
  isOpen,
  onOpenChange,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}: EditPermissionModalProps) {
  const groupService = useGroupService();
  const [selectedPermission, setSelectedPermission] = useState<EnumKey<typeof ROLE>>('MEMBER');
  const { loading, run: runUpdatePermission } = useRequest(
    async (role: number) =>
      groupService.updateMemberRole({
        groupId,
        targetUserIds: memberIds,
        role,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已修改 ${memberIds.length} 位成员的权限`);
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRoles,
    { checkOwner: true }
  );
  const canPromoteToAdmin = groupDisplayConfig.canModifyPermission;

  const handleConfirm = () => {
    const role = ROLE[selectedPermission] ?? ROLE.MEMBER;
    runUpdatePermission(role);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    onOpenChange(nextOpen);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>修改权限</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {memberContainsOwner ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>选中成员中有小组创建者，不可修改权限！</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : !canEdit ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>您不能编辑组长/管理员的权限。</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : (
                <div className={styles.permissionRow}>
                  <label className={styles.permissionLabel}>将以下成员的权限设置为</label>
                  <Select
                    value={selectedPermission}
                    onChange={(value) => setSelectedPermission(value as EnumKey<typeof ROLE>)}
                    className={styles.fullWidth}
                  >
                    {canPromoteToAdmin && <Option value="ADMIN">管理员</Option>}
                    <Option value="MEMBER">成员</Option>
                  </Select>
                </div>
              )}
              <SelectedMemberList members={members} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={confirmDisabled || loading}
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

export default EditPermissionModal;

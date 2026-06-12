import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useQuotaService } from '@/domains';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Form } from 'antd';
import { useState } from 'react';
import type { AssignQuotaModalProps } from './index.type';
import styles from './style.module.less';
import { useMemberEditGuard } from './useMemberEditGuard';

const GROUP_MEMBER_TOKEN_LIMIT_MAX = 100_000_000;

interface QuotaInputProps {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function QuotaInput({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder,
  className,
}: QuotaInputProps) {
  return (
    <TextField
      aria-label="配额限额"
      className={className}
      value={value != null ? String(value) : ''}
      onChange={(nextValue) => {
        if (nextValue === '') {
          onChange?.(null);
          return;
        }
        const parsed = Number(nextValue);
        onChange?.(Number.isFinite(parsed) ? parsed : null);
      }}
      isDisabled={disabled}
    >
      <Input type="number" min={min} max={max} step={1} placeholder={placeholder} />
    </TextField>
  );
}

function AssignQuotaModal({
  isOpen,
  onOpenChange,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}: AssignQuotaModalProps) {
  const quotaService = useQuotaService();
  const [form] = Form.useForm();
  const [groupQuota, setGroupQuotaState] = useState<{ used: number; limit: number }>({
    used: 0,
    limit: 0,
  });

  const maxUsed = Math.max(0, ...members.map((m) => m.used ?? 0));
  const quotaMin = Math.max(1, maxUsed);
  const quotaOverGlobalMax = maxUsed > GROUP_MEMBER_TOKEN_LIMIT_MAX;
  const { canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRolesForQuota,
    { checkOwner: false, forQuota: true }
  );

  const { loading, run: runSetQuota } = useRequest(
    async (value: number) =>
      quotaService.setGroupQuota({
        groupId,
        targetUserIds: memberIds,
        newTokenLimit: Math.min(Math.floor(value), GROUP_MEMBER_TOKEN_LIMIT_MAX),
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已为 ${memberIds.length} 位成员分配配额`);
        form.resetFields();
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    const value = form.getFieldValue('quota');
    if (!value || value <= 0) {
      toast.warning('请输入有效的配额值');
      return;
    }
    if (value > GROUP_MEMBER_TOKEN_LIMIT_MAX) {
      toast.warning(
        `配额限额不能超过 ${GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}（避免超出整型上限）`
      );
      return;
    }
    if (value < maxUsed) {
      toast.warning(`配额限额不能小于成员的当前用量（最大用量：${maxUsed.toLocaleString()}）`);
      return;
    }
    runSetQuota(value);
  };

  useEffectForce(() => {
    if (!isOpen) return;
    form.resetFields();
    quotaService
      .fetchGroupQuota(groupId)
      .then(setGroupQuotaState)
      .catch(() => setGroupQuotaState({ used: 0, limit: 0 }));
  }, [isOpen, groupId, form, quotaService]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (loading) return;
      onOpenChange(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>分配配额</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form form={form} layout="vertical" className={styles.modalFormPadding}>
                {!canEdit && (
                  <Alert status="danger" className={styles.alertBlock}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>您不能分配组长/管理员的配额。</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                {quotaOverGlobalMax && (
                  <Alert status="warning" className={styles.alertBlock}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        {`成员当前用量已超过允许设置的上限（${GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}），无法在此调整配额。`}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                <div className={styles.quotaInfo}>
                  小组配额使用：{groupQuota.used.toLocaleString()} /{' '}
                  {groupQuota.limit.toLocaleString()} 计算点（单成员限额不超过{' '}
                  {GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}）
                </div>
                <Form.Item
                  label="配额限额"
                  name="quota"
                  rules={[
                    { required: true, message: '请输入配额限额' },
                    { type: 'number', min: 1, message: '配额必须大于0' },
                    {
                      validator: (_, val) => {
                        if (val == null) return Promise.resolve();
                        if (val > GROUP_MEMBER_TOKEN_LIMIT_MAX) {
                          return Promise.reject(
                            new Error(`不能超过 ${GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}`)
                          );
                        }
                        if (val < maxUsed) {
                          return Promise.reject(
                            new Error(`不能小于成员当前用量（最大：${maxUsed.toLocaleString()}）`)
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <QuotaInput
                    className={styles.fullWidth}
                    placeholder="请输入整数"
                    min={quotaOverGlobalMax ? 1 : quotaMin}
                    max={GROUP_MEMBER_TOKEN_LIMIT_MAX}
                    disabled={quotaOverGlobalMax}
                  />
                </Form.Item>
                <SelectedMemberList members={members} />
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={loading || confirmDisabled || quotaOverGlobalMax}
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

export default AssignQuotaModal;

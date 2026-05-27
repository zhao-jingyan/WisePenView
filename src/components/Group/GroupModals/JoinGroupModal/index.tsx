import { useGroupService } from '@/domains';
import type { JoinGroupRequest } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { InputOTP, REGEXP_ONLY_DIGITS_AND_CHARS, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Button, Form, Modal } from 'antd';
import React from 'react';
import type { JoinGroupModalProps } from './index.type';

import styles from './index.module.less';

const INVITE_CODE_LENGTH = 8;
const OTP_GROUPS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
];

/** 将邀请码规范为 8 位大写字母数字 */
const normalizeInviteCode = (raw = ''): string =>
  raw
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
    .toUpperCase();

function JoinGroupModal({ open, onCancel, onSuccess }: JoinGroupModalProps) {
  const groupService = useGroupService();
  const [form] = Form.useForm<JoinGroupRequest>();
  const inviteCode = Form.useWatch('inviteCode', form) ?? '';
  const isConfirmDisabled = normalizeInviteCode(inviteCode).length !== INVITE_CODE_LENGTH;

  const { loading, run: runJoinGroup } = useRequest(
    async (params: JoinGroupRequest) => groupService.joinGroup(params),
    {
      manual: true,
      onSuccess: () => {
        toast.success('加入小组成功');
        form.resetFields();
        onSuccess?.();
        onCancel();
      },
      onError: (err: unknown) => {
        const isValidationError =
          err != null &&
          typeof err === 'object' &&
          'errorFields' in err &&
          Array.isArray((err as { errorFields?: unknown }).errorFields);
        if (!isValidationError) {
          toast.danger(parseErrorMessage(err));
        }
      },
    }
  );

  const handleConfirm = async () => {
    const params = await form.validateFields();
    runJoinGroup({
      ...params,
      inviteCode: normalizeInviteCode(params.inviteCode),
    });
  };

  return (
    <Modal
      title="加入小组"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
          确定
        </Button>,
      ]}
      width={400}
    >
      <Form form={form} layout="vertical" className={styles.modalFormPadding}>
        <Form.Item label="邀请码" name="inviteCode" normalize={normalizeInviteCode}>
          <InputOTP
            className={styles.codeInput}
            inputClassName={styles.codeInputHidden}
            maxLength={INVITE_CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            autoComplete="one-time-code"
            inputMode="text"
            pasteTransformer={normalizeInviteCode}
            pushPasswordManagerStrategy="none"
            textAlign="center"
          >
            {OTP_GROUPS.map((group, groupIndex) => (
              <React.Fragment key={group.join('-')}>
                {groupIndex > 0 ? <InputOTP.Separator className={styles.codeSeparator} /> : null}
                <InputOTP.Group className={styles.codeGroup}>
                  {group.map((slotIndex) => (
                    <InputOTP.Slot key={slotIndex} className={styles.codeSlot} index={slotIndex} />
                  ))}
                </InputOTP.Group>
              </React.Fragment>
            ))}
          </InputOTP>
        </Form.Item>
        <p className={styles.hint}>请输入 8 位邀请码，将自动转为大写并分段显示。</p>
      </Form>
    </Modal>
  );
}

export default JoinGroupModal;

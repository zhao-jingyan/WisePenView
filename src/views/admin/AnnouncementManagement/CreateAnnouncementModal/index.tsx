import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useUserService } from '@/domains';
import type { PublishMessageDeliveryScope, PublishMessageType } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Input, Label, ListBox, Select, TextArea, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import styles from './style.module.less';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AnnouncementFormValues {
  title: string;
  messageType: PublishMessageType;
  deliveryScope: PublishMessageDeliveryScope;
  content: string;
  jumpUrl: string;
  receiverUserIds: string;
}

const MESSAGE_TYPE_OPTIONS: Array<{ value: PublishMessageType; label: string }> = [
  { value: 'SYSTEM', label: '系统消息' },
  { value: 'NORMAL', label: '普通消息' },
];

const DELIVERY_SCOPE_OPTIONS: Array<{ value: PublishMessageDeliveryScope; label: string }> = [
  { value: 'ALL_USERS', label: '全员消息' },
  { value: 'DIRECT', label: '定向投递' },
];

const INITIAL_FORM_VALUES: AnnouncementFormValues = {
  title: '',
  messageType: 'SYSTEM',
  deliveryScope: 'ALL_USERS',
  content: '',
  jumpUrl: '',
  receiverUserIds: '',
};

const parseReceiverUserIds = (value: string): string[] =>
  value
    .replace(/[\uFF0C\uFF1B]/g, ',')
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

function CreateAnnouncementModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const userService = useUserService();
  const [formValues, setFormValues] = useState<AnnouncementFormValues>(INITIAL_FORM_VALUES);

  function updateFormValue<K extends keyof AnnouncementFormValues>(
    field: K,
    value: AnnouncementFormValues[K]
  ) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  const reset = () => {
    setFormValues(INITIAL_FORM_VALUES);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  const { loading: submitting, run: runPublishMessage } = useRequest(
    async (values: AnnouncementFormValues) => {
      const receiverUserIds = parseReceiverUserIds(values.receiverUserIds);
      await userService.publishMessage({
        deliveryScope: values.deliveryScope,
        messageType: values.deliveryScope === 'ALL_USERS' ? 'SYSTEM' : values.messageType,
        title: values.title,
        content: values.content,
        jumpUrl: values.jumpUrl,
        receiverUserIds,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('公告发布成功');
        reset();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!formValues.title.trim()) {
      toast.warning('请输入公告标题');
      return;
    }

    if (!formValues.content.trim()) {
      toast.warning('请输入公告内容');
      return;
    }

    if (
      formValues.deliveryScope === 'DIRECT' &&
      parseReceiverUserIds(formValues.receiverUserIds).length === 0
    ) {
      toast.warning('请输入接收用户 ID');
      return;
    }

    runPublishMessage(formValues);
  };

  const canSubmit = Boolean(
    formValues.title.trim() &&
    formValues.content.trim() &&
    (formValues.deliveryScope === 'ALL_USERS' || formValues.receiverUserIds.trim())
  );

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="发布公告"
      confirmText="发布"
      cancelText="取消"
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
      isSubmitDisabled={!canSubmit}
      isDismissable={!submitting}
      size="md"
      placement="center"
    >
      <div className={styles.form}>
        <TextField
          aria-label="公告标题"
          value={formValues.title}
          onChange={(value) => updateFormValue('title', value)}
          isDisabled={submitting}
          isRequired
        >
          <Label>公告标题</Label>
          <Input placeholder="请输入公告标题" autoFocus />
        </TextField>

        <div className={styles.twoColumnFields}>
          <Select
            aria-label="公告类型"
            value={formValues.messageType}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              updateFormValue('messageType', value as PublishMessageType);
            }}
            isDisabled={formValues.deliveryScope === 'ALL_USERS' || submitting}
            isRequired
          >
            <Label>公告类型</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MESSAGE_TYPE_OPTIONS.map((option) => (
                  <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            aria-label="发布范围"
            value={formValues.deliveryScope}
            onChange={(value) => {
              if (value == null || Array.isArray(value)) return;
              const nextScope = value as PublishMessageDeliveryScope;
              updateFormValue('deliveryScope', nextScope);
              if (nextScope === 'ALL_USERS') {
                updateFormValue('messageType', 'SYSTEM');
              }
            }}
            isDisabled={submitting}
            isRequired
          >
            <Label>发布范围</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {DELIVERY_SCOPE_OPTIONS.map((option) => (
                  <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <TextField
          aria-label="公告内容"
          value={formValues.content}
          onChange={(value) => updateFormValue('content', value)}
          isDisabled={submitting}
          isRequired
        >
          <Label>公告内容</Label>
          <TextArea rows={5} placeholder="请输入公告内容" />
        </TextField>

        <TextField
          aria-label="跳转地址"
          value={formValues.jumpUrl}
          onChange={(value) => updateFormValue('jumpUrl', value)}
          isDisabled={submitting}
        >
          <Label>跳转地址</Label>
          <Input placeholder="可选，例如 /app/group" />
        </TextField>

        {formValues.deliveryScope === 'DIRECT' ? (
          <TextField
            aria-label="接收用户 ID"
            value={formValues.receiverUserIds}
            onChange={(value) => updateFormValue('receiverUserIds', value)}
            isDisabled={submitting}
            isRequired
          >
            <Label>接收用户 ID</Label>
            <Input placeholder="多个 ID 用逗号、分号或空格分隔" />
          </TextField>
        ) : null}
      </div>
    </AppFormDialog>
  );
}

export default CreateAnnouncementModal;

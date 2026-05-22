import IconText from '@/components/Common/IconText';
import { useUserService } from '@/domains';
import type { UpdateUserInfoRequest } from '@/domains/User';
import { DEGREE, SEX } from '@/domains/User';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Button, Descriptions, Form, Input, Select } from 'antd';
import type { InputRef } from 'antd/es/input';
import { useMemo, type Ref } from 'react';
import { RiPencilLine } from 'react-icons/ri';
import type { AccountFormProps } from './index.type';
import { getProfileDisplayString } from './profileDisplay';
import styles from './style.module.less';

const { Option } = Select;

function SexReadonlyInput({ value, ref }: { value?: number | null; ref?: Ref<InputRef> }) {
  return (
    <Input
      ref={ref}
      disabled
      readOnly
      value={value != null ? SEX.getLabel(value) : '-'}
      className={styles.editableInput}
    />
  );
}
SexReadonlyInput.displayName = 'SexReadonlyInput';

function DegreeLevelReadonlyInput({ value, ref }: { value?: number | null; ref?: Ref<InputRef> }) {
  return (
    <Input
      ref={ref}
      disabled
      readOnly
      value={value != null ? DEGREE.getLabel(value) : '-'}
      className={styles.editableInput}
    />
  );
}
DegreeLevelReadonlyInput.displayName = 'DegreeLevelReadonlyInput';

function AccountForm({
  show,
  user,
  form,
  fieldConfig,
  visibleFields,
  readonlyFieldSet,
  editMode,
  onEditModeChange,
  onUserInfoUpdated,
  onCancel,
}: AccountFormProps) {
  const userService = useUserService();
  const message = useAppMessage();

  const { loading: saving, runAsync: runSave } = useRequest(
    async () => {
      const values = await form.validateFields();
      const rf = new Set(user?.readonlyFields ?? []);
      const params: UpdateUserInfoRequest = {
        nickname:
          fieldConfig.nickname && !rf.has('nickname')
            ? values.nickname
            : (user?.userInfo?.nickname ?? undefined),
        realName:
          fieldConfig.realName && !rf.has('realName')
            ? values.realName
            : (user?.userInfo?.realName ?? undefined),
        sex: fieldConfig.sex && !rf.has('sex') ? values.sex : user?.userProfile?.sex,
        university:
          fieldConfig.university && !rf.has('university')
            ? (values.university ?? null)
            : (user?.userProfile?.university ?? null),
        college:
          fieldConfig.college && !rf.has('college')
            ? values.college
            : (user?.userProfile?.college ?? undefined),
        major:
          fieldConfig.major && !rf.has('major')
            ? values.major
            : (user?.userProfile?.major ?? undefined),
        className:
          fieldConfig.className && !rf.has('className')
            ? values.className
            : (user?.userProfile?.className ?? undefined),
        enrollmentYear:
          fieldConfig.enrollmentYear && !rf.has('enrollmentYear')
            ? values.enrollmentYear
            : (user?.userProfile?.enrollmentYear ?? undefined),
        degreeLevel:
          fieldConfig.degreeLevel && !rf.has('degreeLevel')
            ? values.degreeLevel
            : typeof user?.userProfile?.degreeLevel === 'number'
              ? user.userProfile.degreeLevel
              : undefined,
        academicTitle:
          fieldConfig.academicTitle && !rf.has('academicTitle')
            ? values.academicTitle
            : (user?.userProfile?.academicTitle ?? undefined),
      };
      await userService.updateUserInfo(params);
      return userService.getFullUserInfo();
    },
    {
      manual: true,
      onSuccess: (data) => {
        onUserInfoUpdated(data);
        onEditModeChange(false);
        message.success('保存成功');
      },
      onError: (err) => {
        if (err && typeof err === 'object' && 'errorFields' in err) return;
        message.error(parseErrorMessage(err));
      },
    }
  );

  const optionsMap = useMemo(
    () =>
      ({
        sex: SEX.options.map(({ value, label }) => (
          <Option key={value} value={value}>
            {label}
          </Option>
        )),
        degreeLevel: DEGREE.options.map(({ value, label }) => (
          <Option key={value} value={value}>
            {label}
          </Option>
        )),
      }) as const,
    []
  );

  if (!show) return null;

  return (
    <div className={styles.profileSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>基本档案</h3>
        {!editMode ? (
          <Button type="primary" onClick={() => onEditModeChange(true)}>
            <IconText icon={<RiPencilLine />} iconSize={16}>
              编辑资料
            </IconText>
          </Button>
        ) : null}
      </div>
      {editMode ? (
        <Form form={form} layout="vertical" className={styles.profileForm}>
          <div className={styles.formFieldsGrid}>
            {visibleFields.map((field) => {
              const lockedByServer = readonlyFieldSet.has(field.key);
              if (lockedByServer) {
                if (field.key === 'sex') {
                  return (
                    <Form.Item key={field.key} name={field.key} label={field.label}>
                      <SexReadonlyInput />
                    </Form.Item>
                  );
                }
                if (field.key === 'degreeLevel') {
                  return (
                    <Form.Item key={field.key} name={field.key} label={field.label}>
                      <DegreeLevelReadonlyInput />
                    </Form.Item>
                  );
                }
                return (
                  <Form.Item key={field.key} name={field.key} label={field.label}>
                    <Input disabled readOnly className={styles.editableInput} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item key={field.key} name={field.key} label={field.label}>
                  {field.type === 'input' ? (
                    <Input placeholder={field.placeholder} className={styles.editableInput} />
                  ) : (
                    <Select
                      placeholder={field.placeholder}
                      allowClear
                      className={styles.editableInput}
                    >
                      {field.optionsKey ? optionsMap[field.optionsKey] : null}
                    </Select>
                  )}
                </Form.Item>
              );
            })}
          </div>
          <div className={styles.formActions}>
            <Form.Item className={styles.submitItem}>
              <Button type="primary" onClick={() => void runSave()} loading={saving}>
                保存
              </Button>
              <Button onClick={onCancel} className={styles.cancelBtn}>
                取消
              </Button>
            </Form.Item>
          </div>
        </Form>
      ) : (
        <Descriptions column={2} layout="vertical" size="small" className={styles.descriptions}>
          {visibleFields.map((field) => (
            <Descriptions.Item key={field.key} label={field.label}>
              {getProfileDisplayString(user, field.key)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}
    </div>
  );
}

export default AccountForm;

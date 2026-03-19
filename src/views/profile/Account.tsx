import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Select,
  Spin,
} from 'antd';
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiMailLine,
  RiPencilLine,
} from 'react-icons/ri';
import { useUserService } from '@/contexts/ServicesContext';
import type {
  GetUserInfoResponse,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from '@/services/User';
import {
  DEGREE_LEVEL_LABELS,
  getDegreeLevelLabel,
  getIdentityTypeLabel,
  getSexLabel,
  IDENTITY_TYPE,
  SEX_LABELS,
  USER_STATUS,
} from '@/constants/user';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getProfileFieldConfig, PROFILE_FIELDS } from './profile.config';
import type { ProfileFieldKey } from './profile.config';
import styles from './style.module.less';

const { Option } = Select;

type ProfileFormValues = UpdateUserInfoRequest;

/** 从 GetUserInfoResponse 中按字段 key 取值（userInfo / userProfile 分流） */
function getProfileFieldValue(
  user: GetUserInfoResponse | null,
  key: ProfileFieldKey
): string | number | null | undefined {
  if (!user) return undefined;
  if (key === 'nickname' || key === 'realName') return user.userInfo[key] ?? undefined;
  return user.userProfile[key] ?? undefined;
}

interface VerifyEmailFormValues {
  email: SendEmailVerifyRequest['email'];
}

const Account: React.FC = () => {
  const userService = useUserService();
  const [user, setUser] = useState<GetUserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [form] = Form.useForm<ProfileFormValues>();
  const [verifyForm] = Form.useForm<VerifyEmailFormValues>();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const data = await userService.getFullUserInfo();
        setUser(data);
        form.setFieldsValue({
          nickname: data.userInfo.nickname ?? undefined,
          realName: data.userInfo.realName ?? undefined,
          sex: data.userProfile.sex,
          university: data.userProfile.university ?? undefined,
          college: data.userProfile.college ?? undefined,
          major: data.userProfile.major ?? undefined,
          className: data.userProfile.className ?? undefined,
          enrollmentYear: data.userProfile.enrollmentYear ?? undefined,
          degreeLevel: data.userProfile.degreeLevel ?? undefined,
          academicTitle: data.userProfile.academicTitle ?? undefined,
        });
      } catch (err) {
        message.error(parseErrorMessage(err, '获取用户信息失败'));
      } finally {
        setLoading(false);
      }
    };
    void loadUser();
  }, [form]);

  const identityType = user?.userInfo?.identityType ?? IDENTITY_TYPE.STUDENT;
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const params: UpdateUserInfoRequest = {
        nickname: fieldConfig.nickname ? values.nickname : (user?.userInfo?.nickname ?? undefined),
        realName: fieldConfig.realName ? values.realName : (user?.userInfo?.realName ?? undefined),
        sex: fieldConfig.sex ? values.sex : user?.userProfile?.sex,
        university: fieldConfig.university
          ? (values.university ?? null)
          : (user?.userProfile?.university ?? null),
        college: fieldConfig.college ? values.college : (user?.userProfile?.college ?? undefined),
        major: fieldConfig.major ? values.major : (user?.userProfile?.major ?? undefined),
        className: fieldConfig.className
          ? values.className
          : (user?.userProfile?.className ?? undefined),
        enrollmentYear: fieldConfig.enrollmentYear
          ? values.enrollmentYear
          : (user?.userProfile?.enrollmentYear ?? undefined),
        degreeLevel: fieldConfig.degreeLevel
          ? values.degreeLevel
          : typeof user?.userProfile?.degreeLevel === 'number'
            ? user.userProfile.degreeLevel
            : undefined,
        academicTitle: fieldConfig.academicTitle
          ? values.academicTitle
          : (user?.userProfile?.academicTitle ?? undefined),
      };
      await userService.updateUserInfo(params);
      const data = await userService.getFullUserInfo();
      setUser(data);
      setEditMode(false);
      message.success('保存成功');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    form.resetFields();
    form.setFieldsValue({
      nickname: user?.userInfo?.nickname ?? undefined,
      realName: user?.userInfo?.realName ?? undefined,
      sex: user?.userProfile?.sex,
      university: user?.userProfile?.university ?? undefined,
      college: user?.userProfile?.college ?? undefined,
      major: user?.userProfile?.major ?? undefined,
      className: user?.userProfile?.className ?? undefined,
      enrollmentYear: user?.userProfile?.enrollmentYear ?? undefined,
      degreeLevel: user?.userProfile?.degreeLevel ?? undefined,
      academicTitle: user?.userProfile?.academicTitle ?? undefined,
    });
    setEditMode(false);
  };

  const handleVerify = () => {
    verifyForm.resetFields();
    setVerifyModalOpen(true);
  };

  const handleVerifyModalCancel = () => {
    verifyForm.resetFields();
    setVerifyModalOpen(false);
  };

  const handleVerifySubmit = async () => {
    try {
      const values = await verifyForm.validateFields();
      const params: SendEmailVerifyRequest = { email: values.email.trim() };
      await userService.sendEmailVerify(params);
      message.success('验证邮件已发送，请查收');
      verifyForm.resetFields();
      setVerifyModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '提交失败'));
    }
  };

  const nickname = user?.userInfo?.nickname ?? user?.userInfo?.username ?? '未设置昵称';
  const avatarLetter = (user?.userInfo?.nickname ?? user?.userInfo?.username ?? '?')
    .charAt(0)
    .toUpperCase();
  const identityLabel =
    user?.userInfo?.identityType != null ? getIdentityTypeLabel(user.userInfo.identityType) : '';
  const optionsMap = {
    sex: Object.entries(SEX_LABELS).map(([value, label]) => (
      <Option key={value} value={Number(value)}>
        {label}
      </Option>
    )),
    degreeLevel: Object.entries(DEGREE_LEVEL_LABELS).map(([value, label]) => (
      <Option key={value} value={Number(value)}>
        {label}
      </Option>
    )),
  } as const;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>账号管理</h1>
        <span className={styles.pageSubtitle}>管理您的账号信息</span>
      </div>
      {user?.userInfo?.status === USER_STATUS.UNVERIFIED && (
        <Alert
          type="warning"
          description="请绑定邮箱以完成账号验证，否则部分功能可能无法正常使用。"
          showIcon
          action={
            <Button size="small" type="link" onClick={handleVerify}>
              去验证
            </Button>
          }
          className={styles.statusBanner}
        />
      )}
      <Spin spinning={loading}>
        <div className={styles.formSection}>
          {/* 头部信息 */}
          <div className={styles.accountHeader}>
            <div className={styles.accountHeaderLeft}>
              <Avatar size={64} className={styles.avatar}>
                {avatarLetter}
              </Avatar>
              <div className={styles.accountInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.nickname}>{nickname}</span>
                  {user?.userInfo?.username != null && (
                    <span className={styles.username}>{user.userInfo.username}</span>
                  )}
                </div>
                {identityLabel && <span className={styles.identityTag}>{identityLabel}</span>}
              </div>
            </div>
            {user?.userInfo?.status != null && (
              <span className={styles.statusGroup}>
                <span className={styles.statusText}>
                  {user.userInfo.status === USER_STATUS.UNVERIFIED
                    ? '未认证'
                    : user.userInfo.status === USER_STATUS.BANNED
                      ? '封禁'
                      : '已认证'}
                </span>
                <span
                  className={styles.statusIcon}
                  title={
                    user.userInfo.status === USER_STATUS.UNVERIFIED
                      ? '未认证'
                      : user.userInfo.status === USER_STATUS.BANNED
                        ? '封禁'
                        : '已认证'
                  }
                >
                  {user.userInfo.status === USER_STATUS.BANNED ? (
                    <RiCloseLine size={24} className={styles.statusIconBanned} />
                  ) : user.userInfo.status === USER_STATUS.UNVERIFIED ? (
                    <RiErrorWarningLine size={24} className={styles.statusIconUnverified} />
                  ) : (
                    <RiCheckLine size={24} className={styles.statusIconVerified} />
                  )}
                </span>
              </span>
            )}
          </div>

          <Divider className={styles.sectionDivider} />

          {/* 账号：仅展示，不可编辑 */}
          <h3 className={styles.sectionTitle}>账号</h3>
          <Descriptions column={2} layout="vertical" size="small" className={styles.descriptions}>
            <Descriptions.Item label="用户名">{user?.userInfo?.username ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="学工号">
              {user?.userInfo?.campusNo === 'PENDING'
                ? '未认证'
                : (user?.userInfo?.campusNo ?? '-')}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.userInfo?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{user?.userInfo?.mobile ?? '-'}</Descriptions.Item>
          </Descriptions>

          <Divider className={styles.sectionDivider} />

          {/* 基本档案：编辑资料在第三栏 */}
          {fieldConfig.showProfileSection && (
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>基本档案</h3>
                {!editMode ? (
                  <Button
                    type="primary"
                    icon={<RiPencilLine size={16} />}
                    onClick={() => setEditMode(true)}
                  >
                    编辑资料
                  </Button>
                ) : null}
              </div>
              {editMode ? (
                <Form form={form} layout="vertical" className={styles.profileForm}>
                  <div className={styles.formFieldsGrid}>
                    {visibleFields.map((field) => {
                      const disabledList = fieldConfig.disabledFields ?? [];
                      const isReadOnly = (disabledList as readonly string[]).includes(field.key);
                      const raw = getProfileFieldValue(user, field.key);
                      const displayValue =
                        field.key === 'sex'
                          ? raw != null
                            ? getSexLabel(raw as number)
                            : '-'
                          : field.key === 'degreeLevel'
                            ? raw != null
                              ? getDegreeLevelLabel(raw as number)
                              : '-'
                            : (raw ?? '-');
                      return (
                        <Form.Item key={field.key} label={field.label} name={field.key}>
                          {isReadOnly ? (
                            <div className={styles.readOnlyField}>{displayValue}</div>
                          ) : field.type === 'input' ? (
                            <Input
                              placeholder={field.placeholder}
                              className={styles.editableInput}
                            />
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
                      <Button type="primary" onClick={handleSaveProfile} loading={saving}>
                        保存
                      </Button>
                      <Button onClick={handleCancelEdit} className={styles.cancelBtn}>
                        取消
                      </Button>
                    </Form.Item>
                  </div>
                </Form>
              ) : (
                <Descriptions
                  column={2}
                  layout="vertical"
                  size="small"
                  className={styles.descriptions}
                >
                  {visibleFields.map((field) => {
                    const raw = getProfileFieldValue(user, field.key);
                    return (
                      <Descriptions.Item key={field.key} label={field.label}>
                        {field.key === 'sex'
                          ? raw != null
                            ? getSexLabel(raw as number)
                            : '-'
                          : field.key === 'degreeLevel'
                            ? raw != null
                              ? getDegreeLevelLabel(raw as number)
                              : '-'
                            : (raw ?? '-')}
                      </Descriptions.Item>
                    );
                  })}
                </Descriptions>
              )}
            </div>
          )}
        </div>
      </Spin>

      <Modal
        title="验证邮箱"
        open={verifyModalOpen}
        onCancel={handleVerifyModalCancel}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={handleVerifyModalCancel}>
            取消
          </Button>,
          <Button key="verify" type="primary" onClick={handleVerifySubmit}>
            验证
          </Button>,
        ]}
        width={480}
      >
        <Alert
          type="info"
          showIcon
          description={<span>请输入完整邮箱地址，系统将发送包含验证链接的邮件。</span>}
        />
        <Form form={verifyForm} layout="vertical" className={styles.verifyForm}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱地址' },
            ]}
          >
            <Input
              prefix={<RiMailLine size={18} className={styles.verifyEmailIcon} />}
              placeholder="请输入完整邮箱地址"
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Account;

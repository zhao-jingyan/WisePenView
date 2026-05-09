import React, { useState } from 'react';
import { useMount, useRequest } from 'ahooks';
import { Form, Typography, Input, Button, Modal } from 'antd';
import { RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthService } from '@/services';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { NewPasswordRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useTranslation } from 'react-i18next';

type NewPasswordFormValues = Pick<NewPasswordRequest, 'newPassword'>;

const NewPassword: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const { t } = useTranslation('auth');
  const [token, setToken] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<NewPasswordFormValues>();
  const navigate = useNavigate();

  useMount(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(queryToken);
  });

  const { loading, run: submitNewPassword } = useRequest(
    async (values: NewPasswordFormValues) =>
      authService.newPassword({ newPassword: values.newPassword, token }),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, t('newPassword.setFailed')));
      },
    }
  );

  const onFinish = (values: NewPasswordFormValues) => {
    if (!token) {
      message.error(t('newPassword.tokenMissing'));
      return;
    }
    submitNewPassword(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('newPassword.title')}</Typography.Title>
      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label={t('newPassword.passwordLabel')}
          name="newPassword"
          rules={[
            { required: true, message: t('newPassword.passwordRequired') },
            { min: 9, message: t('newPassword.passwordMinLength') },
            { pattern: /[a-zA-Z]/, message: t('newPassword.passwordContainsLetter') },
            { pattern: /[0-9]/, message: t('newPassword.passwordContainsNumber') },
          ]}
        >
          <Input.Password
            placeholder={t('newPassword.passwordPlaceholder')}
            size="large"
            prefix={<RiLockLine />}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={auth.submitButton}
            loading={loading}
          >
            {t('newPassword.submit')}
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              <Link to="/login">{t('newPassword.backToLogin')}</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
      <Modal
        title={t('newPassword.successTitle')}
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        destroyOnHidden
        footer={[
          <Button
            key="stay"
            onClick={() => {
              setSuccessModalOpen(false);
              form.resetFields(); // 清空表单
            }}
          >
            {t('newPassword.stayHere')}
          </Button>,
          <Button
            key="login"
            type="primary"
            onClick={() => {
              setSuccessModalOpen(false);
              navigate('/login');
            }}
          >
            {t('newPassword.goToLogin')}
          </Button>,
        ]}
      >
        <Typography.Text>{t('newPassword.successDescription')}</Typography.Text>
      </Modal>
    </div>
  );
};

export default NewPassword;

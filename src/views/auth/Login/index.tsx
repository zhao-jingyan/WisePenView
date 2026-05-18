import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/domains';
import type { LoginRequest } from '@/domains/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiLockLine, RiUserLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';

function Login() {
  const authService = useAuthService();
  const message = useAppMessage();
  const { t } = useTranslation('auth');
  const [contractOpen, setContractOpen] = useState(false);
  const [form] = Form.useForm<LoginRequest>();
  const navigate = useNavigate();

  const { loading, run: submitLogin } = useRequest(
    (values: LoginRequest) => authService.login(values),
    {
      manual: true,
      onSuccess: () => {
        navigate('/app/drive');
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const onFinish = (values: LoginRequest) => {
    submitLogin(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('login.title')}</Typography.Title>

      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label={t('login.accountLabel')}
          name="account"
          rules={[{ required: true, message: t('login.accountRequired') }]}
        >
          <Input placeholder={t('login.accountPlaceholder')} size="large" prefix={<RiUserLine />} />
        </Form.Item>

        <Form.Item
          label={t('login.passwordLabel')}
          name="password"
          rules={[{ required: true, message: t('login.passwordRequired') }]}
        >
          <Input.Password
            placeholder={t('login.passwordPlaceholder')}
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
            {t('login.submit')}
          </Button>
          <div className={auth.rightLinks}>
            <Link to="/register">{t('login.register')}</Link>
            <Link to="/reset-pwd">{t('login.forgotPassword')}</Link>
          </div>
        </Form.Item>
      </Form>

      <div className={auth.leftBottomLinks}>
        <Typography.Text>{t('login.agreementPrefix')}</Typography.Text>
        <Link to="#" onClick={() => setContractOpen(true)}>
          {t('login.agreementLink')}
        </Link>
      </div>

      <ServiceAgreement open={contractOpen} onCancel={() => setContractOpen(false)} />
    </div>
  );
}

export default Login;

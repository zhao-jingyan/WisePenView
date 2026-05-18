import { useUserService } from '@/domains';
import type { ConfirmEmailVerifyRequest } from '@/domains/User';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Alert, Button, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';

function VerifyEmail() {
  const userService = useUserService();
  const message = useAppMessage();
  const { t } = useTranslation('auth');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const { loading, run: runVerify } = useRequest(
    (verifyToken: string) => {
      const params: ConfirmEmailVerifyRequest = { token: verifyToken };
      return userService.confirmEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success(t('verifyEmail.verifySuccess'));
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const onVerify = () => {
    if (loading || !token) {
      if (!token) message.error(t('verifyEmail.invalidToken'));
      return;
    }
    runVerify(token);
  };

  const goToAccount = () => {
    setSuccessModalOpen(false);
    navigate('/app/profile/account', { replace: true, state: { fromVerify: true } });
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('verifyEmail.title')}</Typography.Title>
      <Alert
        className={auth.bindAlert}
        description={t('verifyEmail.alertDescription')}
        type="info"
        showIcon
      />
      <div style={{ marginTop: 24 }}>
        <Button
          type="primary"
          size="large"
          className={auth.submitButton}
          loading={loading}
          onClick={onVerify}
          disabled={!token}
        >
          {t('verifyEmail.submit')}
        </Button>
      </div>
      <Modal
        title={t('verifyEmail.successTitle')}
        open={successModalOpen}
        onCancel={goToAccount}
        destroyOnHidden
        footer={[
          <Button key="close" type="primary" onClick={goToAccount}>
            {t('verifyEmail.goToAccount')}
          </Button>,
        ]}
      >
        <Typography.Text>{t('verifyEmail.successDescription')}</Typography.Text>
      </Modal>
    </div>
  );
}

export default VerifyEmail;

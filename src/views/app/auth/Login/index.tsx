import { FormField, Input, PasswordInput } from '@/components/Input';
import { useAuthService } from '@/domains';
import type { LoginRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';
import { Button, Form, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

type LoginField = keyof LoginRequest;

const DEFAULT_LOGIN_VALUES: LoginRequest = {
  account: '',
  password: '',
};

function Login() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [contractOpen, setContractOpen] = useState(false);
  const [formValues, setFormValues] = useState<LoginRequest>(DEFAULT_LOGIN_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<LoginField>>({});
  const navigate = useNavigate();

  const { loading, run: submitLogin } = useRequest(
    (values: LoginRequest) => authService.login(values),
    {
      manual: true,
      onSuccess: () => {
        navigate('/app/drive');
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const updateFormValue = (field: LoginField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<LoginField> = {
      account: runFieldValidation([
        { test: () => formValues.account.trim().length > 0, message: t('login.accountRequired') },
      ]),
      password: runFieldValidation([
        { test: () => formValues.password.length > 0, message: t('login.passwordRequired') },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    submitLogin({
      account: formValues.account.trim(),
      password: formValues.password,
    });
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('login.title')}</h1>

      <Form onSubmit={handleSubmit} className={auth.form}>
        <FormField
          aria-label={t('login.accountLabel')}
          label={t('login.accountLabel')}
          value={formValues.account}
          onChange={(value) => updateFormValue('account', value)}
          errorMessage={formErrors.account}
          isRequired
        >
          <div className={auth.inputWithIcon}>
            <User className={auth.inputIcon} size={18} aria-hidden="true" />
            <Input placeholder={t('login.accountPlaceholder')} autoComplete="username" />
          </div>
        </FormField>

        <FormField
          aria-label={t('login.passwordLabel')}
          label={t('login.passwordLabel')}
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          errorMessage={formErrors.password}
          isRequired
        >
          <PasswordInput
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
          />
        </FormField>

        <div className={auth.formActions}>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            className={auth.submitButton}
            isDisabled={loading}
          >
            {t('login.submit')}
          </Button>
          <div className={auth.rightLinks}>
            <Link to="/register">{t('login.register')}</Link>
            <Link to="/reset-pwd">{t('login.forgotPassword')}</Link>
          </div>
        </div>
      </Form>

      <div className={auth.leftBottomLinks}>
        <span>{t('login.agreementPrefix')}</span>
        <Link to="#" onClick={() => setContractOpen(true)}>
          {t('login.agreementLink')}
        </Link>
      </div>

      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
    </div>
  );
}

export default Login;

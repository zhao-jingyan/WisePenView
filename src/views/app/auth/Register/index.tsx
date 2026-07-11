import { FormField, Input, PasswordInput } from '@/components/Input';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useAuthService } from '@/domains';
import type { RegisterRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';
import { Button, Checkbox, Form, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;
type RegisterFormValues = RegisterRequest & {
  confirmPassword: string;
};
type RegisterField = keyof RegisterFormValues;

const DEFAULT_REGISTER_VALUES: RegisterFormValues = {
  username: '',
  password: '',
  confirmPassword: '',
};

function Register() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [agreement, setAgreement] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<RegisterFormValues>(DEFAULT_REGISTER_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<RegisterField>>({});
  const navigate = useNavigate();

  const { loading, run: submitRegister } = useRequest(
    (values: RegisterRequest) => authService.register(values),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const updateFormValue = (field: RegisterField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const username = formValues.username.trim();
    const nextErrors: FieldErrors<RegisterField> = {
      username: runFieldValidation([
        { test: () => username.length > 0, message: t('register.usernameRequired') },
        { test: () => USERNAME_PATTERN.test(username), message: t('register.usernamePattern') },
      ]),
      password: runFieldValidation([
        { test: () => formValues.password.length > 0, message: t('register.passwordRequired') },
        { test: () => formValues.password.length >= 9, message: t('register.passwordMinLength') },
        {
          test: () => /[a-zA-Z]/.test(formValues.password),
          message: t('register.passwordContainsLetter'),
        },
        {
          test: () => /[0-9]/.test(formValues.password),
          message: t('register.passwordContainsNumber'),
        },
      ]),
      confirmPassword: runFieldValidation([
        {
          test: () => formValues.confirmPassword.length > 0,
          message: t('register.confirmPasswordRequired'),
        },
        {
          test: () => formValues.confirmPassword === formValues.password,
          message: t('register.confirmPasswordMismatch'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (!agreement) {
      toast.danger(t('register.agreementRequired'));
      return;
    }
    submitRegister({
      username: formValues.username.trim(),
      password: formValues.password,
    });
  };

  const resetForm = () => {
    setFormValues(DEFAULT_REGISTER_VALUES);
    setFormErrors({});
    setAgreement(false);
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('register.title')}</h1>
      <Form onSubmit={handleSubmit} className={auth.form}>
        <FormField
          aria-label={t('register.usernameLabel')}
          label={t('register.usernameLabel')}
          name="username"
          value={formValues.username}
          onChange={(value) => updateFormValue('username', value)}
          errorMessage={formErrors.username}
          isRequired
        >
          <div className={auth.inputWithIcon}>
            <User className={auth.inputIcon} size={18} aria-hidden="true" />
            <Input
              placeholder={t('register.usernamePlaceholder')}
              maxLength={USERNAME_MAX_LENGTH}
              autoComplete="username"
            />
          </div>
        </FormField>

        <FormField
          aria-label={t('register.passwordLabel')}
          label={t('register.passwordLabel')}
          name="password"
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          description={t('common.passwordRules')}
          errorMessage={formErrors.password}
          isRequired
        >
          <PasswordInput
            placeholder={t('register.passwordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('register.confirmPasswordLabel')}
          label={t('register.confirmPasswordLabel')}
          name="confirmPassword"
          value={formValues.confirmPassword}
          onChange={(value) => updateFormValue('confirmPassword', value)}
          errorMessage={formErrors.confirmPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('register.confirmPasswordPlaceholder')}
            autoComplete="new-password"
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
            {t('register.submit')}
          </Button>
          <div className={auth.centerLinks}>
            <span>
              {t('register.hasAccount')}
              <Link to="/login">{t('register.toLogin')}</Link>
            </span>
          </div>
        </div>
      </Form>

      <div className={auth.leftBottomLinks}>
        <Checkbox isSelected={agreement} onChange={(isSelected) => setAgreement(isSelected)}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            {t('register.agreementCheckedPrefix')}
          </Checkbox.Content>
        </Checkbox>
        <Link to="#" onClick={() => setContractOpen(true)}>
          {t('register.agreementLink')}
        </Link>
      </div>

      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
      <AppDisplayDialog
        isOpen={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        title={t('register.registerSuccessTitle')}
        secondaryAction={{
          label: t('register.stayHere'),
          onPress: () => {
            setSuccessModalOpen(false);
            resetForm();
          },
        }}
        primaryAction={{
          label: t('register.goToLogin'),
          onPress: () => {
            setSuccessModalOpen(false);
            navigate('/login');
          },
        }}
      >
        <p>{t('register.registerSuccessDescription')}</p>
      </AppDisplayDialog>
    </div>
  );
}

export default Register;

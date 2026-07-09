import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';

import Input from '../Input';
import type { PasswordInputProps } from './index.type';
import styles from './style.module.less';

function PasswordInput({
  className,
  showPasswordLabel,
  hidePasswordLabel,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const visibilityLabel = visible ? hidePasswordLabel : showPasswordLabel;
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <div className={styles.passwordInput}>
      <Lock className={styles.prefixIcon} size={18} aria-hidden="true" />
      <Input type={visible ? 'text' : 'password'} className={className} {...props} />
      <button
        type="button"
        className={styles.visibilityButton}
        aria-label={visibilityLabel}
        onClick={() => setVisible((nextVisible) => !nextVisible)}
      >
        <VisibilityIcon size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export type { PasswordInputProps };
export default PasswordInput;

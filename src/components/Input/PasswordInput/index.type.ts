import type { InputProps } from '../Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showPasswordLabel: string;
  hidePasswordLabel: string;
}

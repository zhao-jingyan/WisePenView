import type { TextFieldProps } from '@heroui/react';
import type { ReactNode } from 'react';

export interface FormFieldProps extends Omit<TextFieldProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
}

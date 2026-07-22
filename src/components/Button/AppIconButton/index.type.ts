import type { Tooltip } from '@heroui/react';
import type { ReactNode } from 'react';

export interface AppIconButtonTooltipOptions {
  content?: ReactNode;
  delay?: Tooltip['Props']['delay'];
  placement?: Tooltip['ContentProps']['placement'];
}

export interface AppIconButtonProps {
  icon: ReactNode;
  label: string;
  className?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  tooltip?: AppIconButtonTooltipOptions | false;
}

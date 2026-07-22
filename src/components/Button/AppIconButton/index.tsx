import { Tooltip } from '@heroui/react';
import clsx from 'clsx';
import type { AppIconButtonProps } from './index.type';
import styles from './style.module.less';

function AppIconButton({
  icon,
  label,
  className,
  isActive = false,
  isDisabled = false,
  onPress,
}: AppIconButtonProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <button
          type="button"
          className={clsx(styles.root, isActive && styles.active, className)}
          onClick={isDisabled ? undefined : onPress}
          aria-label={label}
          aria-pressed={isActive || undefined}
          aria-disabled={isDisabled || undefined}
        >
          {icon}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

export default AppIconButton;

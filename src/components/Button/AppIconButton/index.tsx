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
  tooltip = {},
}: AppIconButtonProps) {
  const button = (
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
  );

  if (tooltip === false) return button;

  return (
    <Tooltip delay={tooltip.delay}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content placement={tooltip.placement}>{tooltip.content ?? label}</Tooltip.Content>
    </Tooltip>
  );
}

export default AppIconButton;

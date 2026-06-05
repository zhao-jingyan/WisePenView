import { Button, Dropdown } from '@heroui/react';
import { EllipsisVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_DROPDOWN_POPOVER_CLASS } from '../styles';
import type { TableRowActionsProps } from './index.type';
import styles from './style.module.less';

function TableRowActions({ actions, ariaLabel, onAction }: TableRowActionsProps) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.moreActions');

  if (actions.length === 0) {
    return null;
  }

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={resolvedAriaLabel}
          className={styles.trigger}
        >
          <EllipsisVertical size={16} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover className={TABLE_DROPDOWN_POPOVER_CLASS} placement="bottom end">
        <Dropdown.Menu
          aria-label={resolvedAriaLabel}
          onAction={(key) => {
            onAction(String(key));
          }}
        >
          {actions.map((action) => (
            <Dropdown.Item
              key={action.key}
              id={action.key}
              textValue={typeof action.label === 'string' ? action.label : action.key}
              isDisabled={action.disabled}
              variant={action.variant === 'danger' ? 'danger' : undefined}
            >
              {action.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default TableRowActions;

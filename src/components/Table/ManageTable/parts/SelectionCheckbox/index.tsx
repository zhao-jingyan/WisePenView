import { Checkbox } from '@heroui/react';
import type { ComponentProps } from 'react';
import styles from './style.module.less';

export interface TableSelectionCheckboxProps {
  ariaLabel: string;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onClick?: ComponentProps<typeof Checkbox>['onClick'];
}

function TableSelectionCheckbox({
  ariaLabel,
  isSelected,
  isIndeterminate,
  isDisabled,
  onClick,
}: TableSelectionCheckboxProps) {
  return (
    <Checkbox
      slot="selection"
      aria-label={ariaLabel}
      variant="primary"
      className={styles.checkbox}
      data-row-click-ignore="true"
      isSelected={isSelected}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
      onClick={onClick}
    >
      <Checkbox.Content className={styles.content}>
        <Checkbox.Control className={styles.control}>
          <Checkbox.Indicator className={styles.indicator} />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

export default TableSelectionCheckbox;

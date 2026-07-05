import { Checkbox } from '@heroui/react';
import styles from './style.module.less';

export interface TableSelectionCheckboxProps {
  ariaLabel: string;
}

function TableSelectionCheckbox({ ariaLabel }: TableSelectionCheckboxProps) {
  return (
    <Checkbox
      slot="selection"
      aria-label={ariaLabel}
      variant="primary"
      className={styles.checkbox}
      data-row-click-ignore="true"
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

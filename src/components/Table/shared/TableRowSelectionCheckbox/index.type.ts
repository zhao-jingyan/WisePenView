import type { Selection } from '@heroui/react';

export interface TableRowSelectionCheckboxProps {
  ariaLabel: string;
  rowId: string;
  selectedKeys: Selection;
  disabled?: boolean;
  onSelectionChange: (keys: Selection) => void;
}

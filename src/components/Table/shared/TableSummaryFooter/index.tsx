import { Table } from '@heroui/react';
import type { ReactNode } from 'react';
import styles from './style.module.less';

export interface TableSummaryFooterProps {
  summary?: ReactNode;
  className?: string;
}

function TableSummaryFooter({ summary, className }: TableSummaryFooterProps) {
  if (!summary) {
    return null;
  }

  return (
    <Table.Footer className={className ?? styles.footer}>
      <div className={styles.summary}>{summary}</div>
    </Table.Footer>
  );
}

export default TableSummaryFooter;

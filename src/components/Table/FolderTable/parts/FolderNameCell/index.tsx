import EntryIcon from '@/components/EntryIcon';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TableTextCell from '../../../shared/cells/TextCell';
import type { FolderTableRow } from '../../index.type';
import type { FolderTableNameCellProps } from './index.type';
import styles from './style.module.less';

function FolderTableNameCell<T extends FolderTableRow>({
  row,
  depth,
  expanded,
  expandable,
  onToggleExpand,
}: FolderTableNameCellProps<T>) {
  const { t } = useTranslation('table');
  const iconSize = row.entryType === 'folder' ? 16 : 16;

  return (
    <div className={styles.nameCell} data-depth={depth}>
      {expandable ? (
        <button
          type="button"
          className={styles.expandBtn}
          aria-label={expanded ? t('aria.collapse') : t('aria.expand')}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand?.();
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className={styles.expandPlaceholder} aria-hidden />
      )}
      <EntryIcon entryType={row.entryType} resourceType={row.resourceType} size={iconSize} />
      <TableTextCell emphasis className={styles.nameText}>
        {row.name}
      </TableTextCell>
    </div>
  );
}

export default FolderTableNameCell;

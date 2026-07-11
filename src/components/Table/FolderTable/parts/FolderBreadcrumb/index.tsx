import { House } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FolderTableBreadcrumbProps } from './index.type';
import styles from './style.module.less';

function renderLabel(showRootIcon: boolean, label: ReactNode) {
  return (
    <>
      {showRootIcon ? <House size={14} aria-hidden /> : null}
      {label}
    </>
  );
}

function FolderBreadcrumb({ items, onJump, ariaLabel, renderItem }: FolderTableBreadcrumbProps) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.folderPath');

  return (
    <nav className={styles.breadcrumb} aria-label={resolvedAriaLabel}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const showRootIcon = item.isRoot === true;
        const content = isLast ? (
          <span className={styles.current}>{renderLabel(showRootIcon, item.label)}</span>
        ) : (
          <button type="button" className={styles.item} onClick={() => onJump(item.id)}>
            {renderLabel(showRootIcon, item.label)}
          </button>
        );
        return (
          <span key={item.id} className={styles.segment}>
            {index > 0 ? <span className={styles.separator}>/</span> : null}
            {renderItem ? renderItem(content, item, isLast) : content}
          </span>
        );
      })}
    </nav>
  );
}

export default FolderBreadcrumb;

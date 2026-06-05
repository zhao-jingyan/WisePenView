import { House } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FolderTableBreadcrumbProps } from './index.type';
import styles from './style.module.less';

function FolderBreadcrumb({ items, onJump, ariaLabel }: FolderTableBreadcrumbProps) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.folderPath');

  return (
    <nav className={styles.breadcrumb} aria-label={resolvedAriaLabel}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const showRootIcon = item.isRoot;

        return (
          <span key={item.id} className={styles.segment}>
            {index > 0 ? <span className={styles.separator}>/</span> : null}
            {isLast ? (
              <span className={styles.current}>
                {showRootIcon ? <House size={14} aria-hidden /> : null}
                {item.label}
              </span>
            ) : (
              <button type="button" className={styles.item} onClick={() => onJump(item.id)}>
                {showRootIcon ? <House size={14} aria-hidden /> : null}
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default FolderBreadcrumb;

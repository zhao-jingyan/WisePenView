import { House } from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
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

function FolderBreadcrumb({ items, onJump, ariaLabel, dropTarget }: FolderTableBreadcrumbProps) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.folderPath');

  return (
    <nav className={styles.breadcrumb} aria-label={resolvedAriaLabel}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const showRootIcon = item.isRoot === true;
        const isDropActive = dropTarget?.isDropActive?.(item) === true;
        const dropProps = dropTarget
          ? {
              'data-drop-target': isDropActive ? 'true' : undefined,
              onDragEnter: (event: DragEvent<HTMLElement>) => {
                dropTarget.onDragEnter?.(item, event);
              },
              onDragOver: (event: DragEvent<HTMLElement>) => {
                dropTarget.onDragOver?.(item, event);
              },
              onDragLeave: (event: DragEvent<HTMLElement>) => {
                dropTarget.onDragLeave?.(item, event);
              },
              onDrop: (event: DragEvent<HTMLElement>) => {
                dropTarget.onDrop?.(item, event);
              },
            }
          : undefined;

        return (
          <span key={item.id} className={styles.segment}>
            {index > 0 ? <span className={styles.separator}>/</span> : null}
            {isLast ? (
              <span className={styles.current} {...dropProps}>
                {renderLabel(showRootIcon, item.label)}
              </span>
            ) : (
              <button
                type="button"
                className={styles.item}
                onClick={() => onJump(item.id)}
                {...dropProps}
              >
                {renderLabel(showRootIcon, item.label)}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default FolderBreadcrumb;

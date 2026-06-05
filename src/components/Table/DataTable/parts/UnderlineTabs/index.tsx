import { useTranslation } from 'react-i18next';
import type { DataTableTabsProps } from './index.type';
import styles from './style.module.less';

function DataTableTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
}: DataTableTabsProps<T>) {
  const { t } = useTranslation('table');
  const resolvedAriaLabel = ariaLabel ?? t('aria.filter');

  return (
    <div className={styles.tabList} role="tablist" aria-label={resolvedAriaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? styles.tabActive : styles.tabItem}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default DataTableTabs;

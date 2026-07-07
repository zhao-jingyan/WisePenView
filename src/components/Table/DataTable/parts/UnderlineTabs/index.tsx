import { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current.get(activeTab);
    const listEl = listRef.current;
    if (!activeEl || !listEl) return;
    const listRect = listEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({
      left: tabRect.left - listRect.left - listEl.clientLeft,
      width: tabRect.width,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, tabs]);

  useLayoutEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  const setTabRef = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => {
      if (el) {
        tabRefs.current.set(key, el);
      } else {
        tabRefs.current.delete(key);
      }
    },
    []
  );

  return (
    <div className={styles.tabList} role="tablist" aria-label={resolvedAriaLabel} ref={listRef}>
      <div
        className={styles.indicator}
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            ref={setTabRef(tab.key)}
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

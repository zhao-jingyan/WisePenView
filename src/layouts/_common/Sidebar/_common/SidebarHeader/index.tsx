import logoImg from '@/assets/images/logo-icon.png';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import type { SidebarHeaderProps } from './index.type';
import styles from './style.module.less';

function SidebarHeader({
  collapsed,
  onToggle,
  title = 'WisePen',
  nav,
  reserveToggleSlot = false,
}: SidebarHeaderProps) {
  const [navFolded, setNavFolded] = useState(false);
  const hasNav = Boolean(nav);
  const headerNavFolded = hasNav && !collapsed && navFolded;
  const toggleLabel = collapsed ? '展开侧边栏' : '收起侧边栏';

  const handleLogoRowPress = () => {
    if (!hasNav) return;
    setNavFolded((folded) => !folded);
  };
  const logoContent = (
    <>
      <div className={styles.logoIcon}>
        <img src={logoImg} alt="WisePen" />
      </div>
      <span className={styles.logoText}>{title}</span>
    </>
  );

  return (
    <div className={styles.header}>
      <div
        className={clsx(
          styles.headerTop,
          collapsed && styles.collapsedHeaderTop,
          reserveToggleSlot && !collapsed && styles.headerTopWithToggleSlot
        )}
      >
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className={styles.triggerBtn}
            aria-label={toggleLabel}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        ) : null}

        {!collapsed && hasNav ? (
          <button
            type="button"
            className={styles.logoToggle}
            onClick={handleLogoRowPress}
            aria-expanded={!navFolded}
            aria-label={navFolded ? '展开顶部导航' : '收起顶部导航'}
          >
            {logoContent}
            <span className={styles.logoChevron} aria-hidden="true">
              {navFolded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </span>
          </button>
        ) : null}

        {!collapsed && !hasNav ? (
          <div className={clsx(styles.logoToggle, styles.logoStatic)}>{logoContent}</div>
        ) : null}
      </div>

      {hasNav ? (
        <div
          className={clsx(
            styles.headerNav,
            collapsed && styles.headerNavCollapsed,
            headerNavFolded && styles.headerNavFolded
          )}
        >
          {nav}
        </div>
      ) : null}
    </div>
  );
}

export default SidebarHeader;

import logoImg from '@/assets/images/logo-icon.png';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, IndentDecrease, IndentIncrease } from 'lucide-react';
import { useState } from 'react';
import type { SidebarHeaderProps } from './index.type';
import styles from './style.module.less';

function SidebarHeader({ collapsed, onToggle, title = 'WisePen', nav }: SidebarHeaderProps) {
  const [navFolded, setNavFolded] = useState(false);
  const headerNavFolded = !collapsed && navFolded;

  const handleLogoRowPress = () => {
    setNavFolded((folded) => !folded);
  };

  return (
    <div className={styles.header}>
      <div className={clsx(styles.headerTop, collapsed && styles.collapsedHeaderTop)}>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className={styles.triggerBtn}
            aria-label="切换侧边栏"
          >
            {collapsed ? (
              <IndentIncrease size={18} style={{ transform: 'rotate(180deg)' }} />
            ) : (
              <IndentDecrease size={18} style={{ transform: 'rotate(180deg)' }} />
            )}
          </button>
        ) : null}

        {!collapsed && (
          <button
            type="button"
            className={styles.logoToggle}
            onClick={handleLogoRowPress}
            aria-expanded={!navFolded}
            aria-label={navFolded ? '展开顶部导航' : '收起顶部导航'}
          >
            <div className={styles.logoIcon}>
              <img src={logoImg} alt="WisePen" />
            </div>
            <span className={styles.logoText}>{title}</span>
            <span className={styles.logoChevron} aria-hidden="true">
              {navFolded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </span>
          </button>
        )}
      </div>

      <div
        className={clsx(
          styles.headerNav,
          collapsed && styles.headerNavCollapsed,
          headerNavFolded && styles.headerNavFolded
        )}
      >
        {nav}
      </div>
    </div>
  );
}

export default SidebarHeader;

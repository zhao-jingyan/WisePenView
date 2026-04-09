import React from 'react';
import clsx from 'clsx';
import { RiIndentDecrease, RiIndentIncrease } from 'react-icons/ri';
import logoImg from '@/assets/images/logo-icon.png';
import HeaderNav from '../HeaderNav';
import type { SidebarHeaderProps } from './index.type';
import styles from './style.module.less';

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed, onToggle, onSessionCreated }) => {
  return (
    <div className={styles.header}>
      <div className={clsx(styles.headerTop, collapsed && styles.collapsedHeaderTop)}>
        <button
          type="button"
          onClick={onToggle}
          className={styles.triggerBtn}
          aria-label="切换侧边栏"
        >
          {collapsed ? <RiIndentIncrease size={18} /> : <RiIndentDecrease size={18} />}
        </button>

        {!collapsed && (
          <>
            <div className={styles.logoIcon}>
              <img src={logoImg} alt="WisePen" />
            </div>
            <span className={styles.logoText}>WisePen</span>
          </>
        )}
      </div>

      <div className={clsx(styles.headerNav, collapsed && styles.headerNavCollapsed)}>
        <HeaderNav collapsed={collapsed} onSessionCreated={onSessionCreated} />
      </div>
    </div>
  );
};

export default SidebarHeader;

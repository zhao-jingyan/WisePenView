import React from 'react';
import { Divider, Flex } from 'antd';
import { Outlet } from 'react-router-dom';

import LandingNavbar from '@/components/LandingNavbar';
import styles from './HomeLayout.module.less';

const HomeLayout: React.FC = () => {
  return (
    <Flex vertical align="stretch" className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar activeKey="1" />
      </div>

      <div className={styles.outlet}>
        <Outlet />
      </div>

      <Flex vertical align="stretch" className={styles.footer} gap={0}>
        <div className={styles.waveWrap} aria-hidden>
          <svg
            className={styles.waveSvg}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            preserveAspectRatio="none"
            x="0px"
            y="0px"
            viewBox="0 0 2560 100"
            xmlSpace="preserve"
          >
            <polygon points="2560 0 2560 100 0 100" />
          </svg>
        </div>

        <div className={styles.footerInner}>
          <Flex align="flex-end" gap={10}>
            <div className={styles.footerBrandText}>WisePen</div>
          </Flex>

          <Divider className={styles.divider} />

          <Flex className={styles.copyright} justify="flex-end">
            <div>Copyright © 2026. Fudan University & Oriole Software All rights reserved.</div>
          </Flex>
        </div>
      </Flex>
    </Flex>
  );
};

export default HomeLayout;

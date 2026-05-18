import { Menu } from 'antd';
import { useImperativeHandle, type Ref } from 'react';
import { useSessionListGroup } from '../SessionListGroup';
import type { SessionSectionProps, SessionSectionRef } from './index.type';
import styles from './style.module.less';

function SessionSection({
  activeSessionMenuKey,
  onActiveSessionMenuKeyChange,
  ref,
}: SessionSectionProps & { ref?: Ref<SessionSectionRef> }) {
  const { menuItems, refresh } = useSessionListGroup({
    activeSessionMenuKey,
    onActiveSessionMenuKeyChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string) => {
        onActiveSessionMenuKeyChange(`session-${sessionId}`);
        await refresh();
      },
    }),
    [onActiveSessionMenuKeyChange, refresh]
  );

  return (
    <div className={styles.sessionSection}>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={activeSessionMenuKey ? [activeSessionMenuKey] : []}
        items={menuItems}
      />
    </div>
  );
}

SessionSection.displayName = 'SessionSection';

export default SessionSection;

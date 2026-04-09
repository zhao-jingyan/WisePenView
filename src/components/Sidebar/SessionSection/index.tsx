import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SessionListGroup from '../SessionListGroup';
import type { SessionListGroupRef } from '../SessionListGroup/index.type';
import type { SessionSectionProps, SessionSectionRef } from './index.type';
import styles from './style.module.less';

const SessionSection = forwardRef<SessionSectionRef, SessionSectionProps>(
  ({ activeSessionMenuKey, onActiveSessionMenuKeyChange }, ref) => {
    const sessionListRef = useRef<SessionListGroupRef>(null);

    useImperativeHandle(
      ref,
      () => ({
        handleCreatedSession: async (sessionId: string) => {
          onActiveSessionMenuKeyChange(`session-${sessionId}`);
          await sessionListRef.current?.refresh();
        },
      }),
      [onActiveSessionMenuKeyChange]
    );

    return (
      <div className={styles.sessionSection}>
        <SessionListGroup
          ref={sessionListRef}
          activeSessionMenuKey={activeSessionMenuKey}
          onActiveSessionMenuKeyChange={onActiveSessionMenuKeyChange}
        />
      </div>
    );
  }
);

SessionSection.displayName = 'SessionSection';

export default SessionSection;

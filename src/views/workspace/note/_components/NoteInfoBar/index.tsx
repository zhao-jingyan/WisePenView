import { Separator } from '@heroui/react';

import UserCapsule from '@/components/UserCapsule';
import type { NoteInfoBarProps } from './index.type';
import styles from './style.module.less';

function NoteInfoBar({ noteInfoDisplay }: NoteInfoBarProps) {
  const { authors, lastEditedAtText } = noteInfoDisplay;

  return (
    <div className={styles.noteInfoBar}>
      {/* 第一行：作者 / 上次编辑 */}
      <div className={styles.metaRow}>
        <div className={`${styles.noteInfoItem} ${styles.authorsInfoItem}`}>
          <div className={styles.authorsWrap}>
            {authors.length > 0 ? (
              authors.map((author, index) => (
                <UserCapsule
                  key={`${author.name}-${index}`}
                  name={author.name}
                  avatar={author.avatar}
                  variant="bare"
                />
              ))
            ) : (
              <span className={styles.noteInfoValue}>暂无</span>
            )}
          </div>
        </div>
        <Separator orientation="vertical" className={styles.infoDivider} />
        <div className={styles.noteInfoItem}>
          <span className={styles.noteInfoLabel}>上次编辑</span>
          <span className={styles.noteInfoValue}>{lastEditedAtText}</span>
        </div>
      </div>
    </div>
  );
}

export default NoteInfoBar;

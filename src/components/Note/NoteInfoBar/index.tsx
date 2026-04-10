import React from 'react';
import { Avatar, Divider } from 'antd';

import type { NoteInfoBarProps } from './index.type';
import styles from './style.module.less';

const NoteInfoBar: React.FC<NoteInfoBarProps> = ({ noteInfoDisplay }) => {
  const authors = noteInfoDisplay?.authors ?? [];
  const lastEditedAtText = noteInfoDisplay?.lastEditedAtText ?? '暂无';

  return (
    <div className={styles.noteInfoBar}>
      <div className={`${styles.noteInfoItem} ${styles.authorsInfoItem}`}>
        <div className={styles.authorsWrap}>
          {authors.length > 0 ? (
            authors.map((author, index) => (
              <div className={styles.authorItem} key={`${author.name}-${index}`}>
                <Avatar size={20} src={author.avatar} className={styles.authorAvatar}>
                  {author.name.slice(0, 1)}
                </Avatar>
                <span className={styles.noteInfoValue}>{author.name}</span>
              </div>
            ))
          ) : (
            <span className={styles.noteInfoValue}>暂无</span>
          )}
        </div>
      </div>
      <Divider orientation="vertical" className={styles.infoDivider} />
      <div className={styles.noteInfoItem}>
        <span className={styles.noteInfoLabel}>上次编辑</span>
        <span className={styles.noteInfoValue}>{lastEditedAtText}</span>
      </div>
    </div>
  );
};

export default NoteInfoBar;

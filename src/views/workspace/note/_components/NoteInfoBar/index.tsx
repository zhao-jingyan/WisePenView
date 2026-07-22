import AppAvatar from '@/components/Avatar';
import { Separator } from '@heroui/react';

import type { NoteInfoDisplayData } from '@/domains/Note';
import styles from './style.module.less';

interface NoteInfoBarProps {
  noteInfoDisplay: NoteInfoDisplayData;
}

const getAvatarText = (name: string): string => {
  const displayName = name.trim();
  return displayName ? displayName.charAt(0).toUpperCase() : '?';
};

function NoteInfoBar({ noteInfoDisplay }: NoteInfoBarProps) {
  const authors = noteInfoDisplay.authors;
  const lastEditedAtText = noteInfoDisplay.lastEditedAtText;
  const hasAuthors = authors.length > 0;
  const authorNamesText = authors.map((author) => author.name).join(', ');

  return (
    <div className={styles.noteInfoBar}>
      <div className={styles.metaRow}>
        <div className={`${styles.noteInfoItem} ${styles.authorsInfoItem}`}>
          <div
            className={styles.authorsInfo}
            aria-label={hasAuthors ? `作者：${authorNamesText}` : '作者：暂无'}
          >
            {hasAuthors ? (
              <>
                <div className={styles.avatarStack} aria-hidden="true">
                  {authors.map((author) => (
                    <AppAvatar
                      key={author.id}
                      aria-label={author.name}
                      className={styles.avatar}
                      title={author.name}
                    >
                      {author.avatar ? (
                        <AppAvatar.Image alt={author.name} src={author.avatar} />
                      ) : null}
                      <AppAvatar.Fallback className={styles.avatarFallback}>
                        {getAvatarText(author.name)}
                      </AppAvatar.Fallback>
                    </AppAvatar>
                  ))}
                </div>
                <span className={styles.authorNames} title={authorNamesText}>
                  {authorNamesText}
                </span>
              </>
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

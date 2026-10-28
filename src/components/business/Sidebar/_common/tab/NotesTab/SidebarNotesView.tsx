import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import EntryIcon from '@/components/business/Icons/EntryIcon';

import type { SidebarNoteItem } from './index.type';
import { groupSidebarNotes, type SidebarNoteSectionKey } from './sidebarNoteModel';
import styles from './style.module.scss';

interface SidebarNotesViewProps {
  notes: SidebarNoteItem[];
  selectedNoteId?: string;
  loading?: boolean;
  hasError?: boolean;
  now?: Date;
  onOpenNote: (note: SidebarNoteItem) => void;
}

const SECTION_LABEL_KEYS = {
  today: 'sidebar.noteSections.today',
  last7Days: 'sidebar.noteSections.last7Days',
  last30Days: 'sidebar.noteSections.last30Days',
  older: 'sidebar.noteSections.older',
} as const satisfies Record<SidebarNoteSectionKey, string>;

function SidebarNotesView({
  notes,
  selectedNoteId,
  loading = false,
  hasError = false,
  now,
  onOpenNote,
}: SidebarNotesViewProps) {
  const { t } = useTranslation('shell');

  if (loading && notes.length === 0) {
    return (
      <div className={styles.state} aria-live="polite">
        {t('sidebar.noteLoading')}
      </div>
    );
  }

  if (hasError && notes.length === 0) {
    return (
      <div className={styles.state} role="alert">
        {t('sidebar.noteLoadFailed')}
      </div>
    );
  }

  if (notes.length === 0) {
    return <div className={styles.state}>{t('sidebar.noteEmpty')}</div>;
  }

  const groups = groupSidebarNotes(notes, now);

  return (
    <nav className={styles.root} aria-label={t('sidebar.noteListAria')}>
      {groups.map((group) => {
        const headingId = `sidebar-notes-${group.key}`;
        return (
          <section key={group.key} className={styles.section} aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.sectionTitle}>
              {t(SECTION_LABEL_KEYS[group.key])}
            </h3>
            <ul className={styles.noteList}>
              {group.notes.map((note) => {
                const title = note.title.trim() || t('sidebar.noteUntitled');
                const isSelected = note.resourceId === selectedNoteId;
                return (
                  <li key={note.resourceId}>
                    <AppPressable
                      className={styles.noteItem}
                      data-selected={isSelected ? 'true' : undefined}
                      aria-label={title}
                      aria-current={isSelected ? 'page' : undefined}
                      onClick={() => onOpenNote(note)}
                    >
                      <span className={styles.noteIcon} aria-hidden="true">
                        <EntryIcon entryType="resource" resourceIconType="note" size={16} />
                      </span>
                      <span className={styles.noteTitle}>{title}</span>
                    </AppPressable>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

export default SidebarNotesView;

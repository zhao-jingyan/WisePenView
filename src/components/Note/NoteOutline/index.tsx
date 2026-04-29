import React, { useMemo } from 'react';
import clsx from 'clsx';

import type { NoteOutlineItem, NoteOutlineProps } from './index.type';
import styles from './style.module.less';

function clampLevel(level: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  if (level <= 0) return 0;
  if (level === 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  if (level === 4) return 4;
  if (level === 5) return 5;
  return 6;
}

function resolveLevelClass(level: number): string {
  const l = clampLevel(level);
  return styles[`level${l}`];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function filterItems(items: NoteOutlineItem[], maxLevel?: number): NoteOutlineItem[] {
  if (!maxLevel || maxLevel < 1) return items;
  return items.filter((it) => it.level <= maxLevel);
}

const NoteOutline: React.FC<NoteOutlineProps> = ({ items, activeId, onNavigate, maxLevel }) => {
  const displayItems = useMemo(() => filterItems(items, maxLevel), [items, maxLevel]);

  return (
    <div className={styles.root} aria-label="文档目录">
      <div className={styles.list} role="list">
        {displayItems.length === 0 ? (
          <div className={styles.empty}>暂无标题</div>
        ) : (
          displayItems.map((it) => {
            const text = normalizeText(it.text) || '（无标题）';
            const isActive = activeId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                role="listitem"
                className={clsx(
                  styles.item,
                  resolveLevelClass(it.level),
                  it.level === 0 && styles.titleItem,
                  isActive && styles.active
                )}
                aria-current={isActive ? 'true' : undefined}
                title={text}
                onClick={() => onNavigate(it.id)}
              >
                {text}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NoteOutline;

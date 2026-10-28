import { parseTimestampToDate } from '@/utils/format';

import type { SidebarNoteItem } from './index.type';

export const SIDEBAR_NOTE_SECTION_KEYS = ['today', 'last7Days', 'last30Days', 'older'] as const;

export type SidebarNoteSectionKey = (typeof SIDEBAR_NOTE_SECTION_KEYS)[number];

export interface SidebarNoteGroup {
  key: SidebarNoteSectionKey;
  notes: SidebarNoteItem[];
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const SEVEN_DAYS_MS = 7 * DAY_MS;
const THIRTY_DAYS_MS = 30 * DAY_MS;

const isSameLocalDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const resolveSectionKey = (editedAt: Date | null, now: Date): SidebarNoteSectionKey => {
  if (editedAt && isSameLocalDay(editedAt, now)) return 'today';

  const elapsedMs = editedAt ? now.getTime() - editedAt.getTime() : Number.POSITIVE_INFINITY;
  if (elapsedMs < SEVEN_DAYS_MS) return 'last7Days';
  if (elapsedMs < THIRTY_DAYS_MS) return 'last30Days';
  return 'older';
};

/**
 * 将笔记按最后编辑时间降序分桶。
 *
 * 今天按本地自然日判断；其余分组沿用“最近 7 天 / 30 天”的滚动时间窗口。
 * 时间缺失的笔记保留在末尾，避免单条元数据异常导致列表消失。
 */
export const groupSidebarNotes = (
  notes: SidebarNoteItem[],
  now: Date = new Date()
): SidebarNoteGroup[] => {
  const notesWithIndex = notes.map((note, index) => ({
    note,
    index,
    editedAt: parseTimestampToDate(note.lastEditedAtText),
  }));
  notesWithIndex.sort((left, right) => {
    const leftTime = left.editedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rightTime = right.editedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    return rightTime - leftTime || left.index - right.index;
  });

  const notesBySection = new Map<SidebarNoteSectionKey, SidebarNoteItem[]>(
    SIDEBAR_NOTE_SECTION_KEYS.map((key) => [key, []])
  );
  notesWithIndex.forEach(({ note, editedAt }) => {
    notesBySection.get(resolveSectionKey(editedAt, now))?.push(note);
  });

  return SIDEBAR_NOTE_SECTION_KEYS.map((key) => ({
    key,
    notes: notesBySection.get(key) ?? [],
  })).filter((group) => group.notes.length > 0);
};

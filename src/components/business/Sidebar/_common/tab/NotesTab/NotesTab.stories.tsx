import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { formatTimestampToDateTime } from '@/utils/format';

import type { SidebarNoteItem } from './index.type';
import styles from './NotesTab.stories.module.scss';
import SidebarNotesView from './SidebarNotesView';

const storyNow = new Date(2026, 9, 28, 17, 0, 0);

const createStoryDate = (daysAgo: number, hour: number): string => {
  const date = new Date(storyNow);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return formatTimestampToDateTime(date);
};

const storyNotes: SidebarNoteItem[] = [
  {
    resourceId: 'story-note-today',
    title: '期末复习提纲',
    lastEditedAtText: createStoryDate(0, 15),
  },
  {
    resourceId: 'story-note-yesterday',
    title: '计算机网络课程笔记',
    lastEditedAtText: createStoryDate(1, 21),
  },
  {
    resourceId: 'story-note-week',
    title: '数据结构：树与图',
    lastEditedAtText: createStoryDate(4, 10),
  },
  {
    resourceId: 'story-note-month',
    title: '产品需求讨论记录',
    lastEditedAtText: createStoryDate(12, 14),
  },
  {
    resourceId: 'story-note-older',
    title: '春季学期阅读清单',
    lastEditedAtText: createStoryDate(45, 9),
  },
];

const meta = {
  title: 'Sidebar/笔记分组',
  component: SidebarNotesView,
  parameters: {
    layout: 'centered',
  },
  args: {
    notes: storyNotes,
    selectedNoteId: 'story-note-today',
    now: storyNow,
    onOpenNote: fn(),
  },
} satisfies Meta<typeof SidebarNotesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GroupedByUpdatedAt: Story = {
  render: (args) => (
    <div className={styles.frame}>
      <SidebarNotesView {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    notes: [],
    loading: true,
  },
  render: GroupedByUpdatedAt.render,
};

export const Empty: Story = {
  args: {
    notes: [],
  },
  render: GroupedByUpdatedAt.render,
};

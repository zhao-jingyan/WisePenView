import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundled = await build({
  entryPoints: ['src/components/business/Sidebar/_common/tab/NotesTab/sidebarNoteModel.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  alias: { '@': join(root, 'src') },
});
const { groupSidebarNotes } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
);
const loaderBundle = await build({
  entryPoints: ['src/components/business/Sidebar/_common/tab/NotesTab/sidebarNoteLoader.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  alias: { '@': join(root, 'src') },
});
const { loadSidebarNotes } = await import(
  `data:text/javascript;base64,${Buffer.from(loaderBundle.outputFiles[0].contents).toString('base64')}`
);

test('侧栏笔记按最后编辑时间降序分组', () => {
  const now = new Date(2026, 9, 28, 12, 0, 0);
  const groups = groupSidebarNotes(
    [
      { resourceId: 'month', title: '近三十天', lastEditedAtText: '2026-10-20 09:00:00' },
      { resourceId: 'week', title: '近七天', lastEditedAtText: '2026-10-22 15:00:00' },
      { resourceId: 'today-old', title: '今天较早', lastEditedAtText: '2026-10-28 08:30:00' },
      { resourceId: 'today-new', title: '今天最新', lastEditedAtText: '2026-10-28 11:30:00' },
      { resourceId: 'older', title: '更早之前', lastEditedAtText: '2026-09-01 09:00:00' },
    ],
    now
  );

  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      notes: group.notes.map((note) => note.resourceId),
    })),
    [
      { key: 'today', notes: ['today-new', 'today-old'] },
      { key: 'last7Days', notes: ['week'] },
      { key: 'last30Days', notes: ['month'] },
      { key: 'older', notes: ['older'] },
    ]
  );
});

test('缺少编辑时间的笔记保留在更早之前且不打断有效排序', () => {
  const now = new Date(2026, 9, 28, 12, 0, 0);
  const groups = groupSidebarNotes(
    [
      { resourceId: 'unknown-a', title: '未知时间 A', lastEditedAtText: '' },
      { resourceId: 'today', title: '今天', lastEditedAtText: '2026-10-28 09:00:00' },
      { resourceId: 'unknown-b', title: '未知时间 B', lastEditedAtText: '无效时间' },
    ],
    now
  );

  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      notes: group.notes.map((note) => note.resourceId),
    })),
    [
      { key: 'today', notes: ['today'] },
      { key: 'older', notes: ['unknown-a', 'unknown-b'] },
    ]
  );
});

test('以 .Note 目录内容为准，不因 resourceType 缺失而丢弃已有笔记', async () => {
  const folder = {
    id: 'folder:tag-note',
    type: 'folder',
    parentId: 'drive-root',
    scope: { type: 'personal', rootId: 'drive-root' },
    tagId: 'tag-note',
    name: '',
    systemType: 'note',
    ancestorTagIds: [],
  };
  const resourceNode = {
    id: 'resource:note-1:tag-note',
    type: 'resource',
    parentId: folder.id,
    scope: folder.scope,
    resourceId: 'note-1',
    title: '未命名笔记',
    resourceIconType: 'note',
    mountTagId: folder.tagId,
  };
  let requestedResourceType;
  const driveService = {
    getSystemFolder: async ({ type }) => {
      assert.equal(type, 'note');
      return folder;
    },
    loadNodeChildren: async (params) => {
      requestedResourceType = params.resourceType;
      return {
        folderNodes: [],
        resourceNodes: [resourceNode],
        folderTotal: 0,
        resourceTotal: 1,
        total: 1,
      };
    },
  };
  const noteService = {
    getNoteInfoDisplay: async ({ resourceId }) => ({
      noteTitle: resourceId === 'note-1' ? '未命名笔记' : '',
      lastEditedAtText: '2026-10-28 16:00:00',
    }),
  };

  const result = await loadSidebarNotes(driveService, noteService);

  assert.equal(requestedResourceType, undefined);
  assert.deepEqual(result.notes, [
    {
      resourceId: 'note-1',
      title: '未命名笔记',
      lastEditedAtText: '2026-10-28 16:00:00',
    },
  ]);
  assert.deepEqual(result.location, {
    scope: folder.scope,
    mountTagId: folder.tagId,
  });
});

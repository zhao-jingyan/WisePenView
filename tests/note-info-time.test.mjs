import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundled = await build({
  entryPoints: ['src/domains/Note/mapper/NoteServices.map.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  alias: { '@': join(root, 'src') },
});
const { NoteServicesMap } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
);

const resourceInfo = {
  resourceId: 'note-1',
  resourceName: '未命名笔记',
  ownerId: '1',
  ownerInfo: { nickname: '示例用户' },
  resourceType: 'NOTE',
};

test('Note info 使用后端顶层 updateTime 生成编辑时间', () => {
  const result = NoteServicesMap.mapNoteInfoDisplayFromApi({
    resourceInfo,
    version: 2,
    updateTime: '2026-10-28T16:00:00',
    authorsDisplay: {},
  });

  assert.equal(result.lastEditedAtText, '2026-10-28 16:00:00');
});

test('Note info 兼容旧嵌套 lastUpdatedAt', () => {
  const result = NoteServicesMap.mapNoteInfoDisplayFromApi({
    resourceInfo,
    noteInfo: { lastUpdatedAt: '2026-10-27T09:00:00' },
  });

  assert.equal(result.lastEditedAtText, '2026-10-27 09:00:00');
});

import { describe, expect, it } from 'vitest';

import { resolveNoteCommentsRuntimeState } from './state';

describe('resolveNoteCommentsRuntimeState', () => {
  it('禁用时不挂载评论能力', () => {
    expect(resolveNoteCommentsRuntimeState({ kind: 'disabled' })).toEqual({
      enabled: false,
      uiEnabled: false,
      hasWritePermission: false,
      canWrite: false,
    });
  });

  it('连接中保留 schema 和权限身份，但不开放 UI 与写入', () => {
    expect(
      resolveNoteCommentsRuntimeState({ kind: 'connecting', hasWritePermission: true })
    ).toEqual({
      enabled: true,
      uiEnabled: false,
      hasWritePermission: true,
      canWrite: false,
    });
  });

  it('只读时仅开放展示', () => {
    expect(resolveNoteCommentsRuntimeState({ kind: 'readOnly' })).toEqual({
      enabled: true,
      uiEnabled: true,
      hasWritePermission: false,
      canWrite: false,
    });
  });

  it('可写时开放完整评论能力', () => {
    expect(resolveNoteCommentsRuntimeState({ kind: 'writable' })).toEqual({
      enabled: true,
      uiEnabled: true,
      hasWritePermission: true,
      canWrite: true,
    });
  });
});

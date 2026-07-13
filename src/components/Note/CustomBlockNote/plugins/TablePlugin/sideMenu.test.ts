import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../../noteEditorComposition';

const tableBlock = {
  type: 'table',
  props: {},
  content: {
    rows: [{ cells: [{}, {}, {}] }],
    columnWidths: [120, 180, 240],
    headerRows: 1,
  },
};

describe('Note block owner side menu', () => {
  it('由 table owner 提供结构化菜单状态', () => {
    const state = notePluginRegistry.blockPlugins.get('table')?.sideMenu?.inspect?.(tableBlock);

    expect(state?.variant).toBe('structured');
    expect(state?.actions?.map(({ id, kind, selected }) => ({ id, kind, selected }))).toEqual([
      { id: 'header-row', kind: 'toggle', selected: true },
      { id: 'header-column', kind: 'toggle', selected: false },
      { id: 'reset-column-widths', kind: 'command', selected: undefined },
    ]);
  });

  it('由 table owner 生成标题行与均分列宽更新', () => {
    const sideMenu = notePluginRegistry.blockPlugins.get('table')?.sideMenu;

    expect(sideMenu?.apply?.(tableBlock, 'header-row')).toEqual({
      type: 'table',
      content: {
        ...tableBlock.content,
        headerRows: undefined,
      },
    });
    expect(sideMenu?.apply?.(tableBlock, 'reset-column-widths')).toEqual({
      type: 'table',
      content: {
        ...tableBlock.content,
        columnWidths: [undefined, undefined, undefined],
      },
    });
  });

  it('由 heading owner 提供菜单 DOM metadata', () => {
    expect(
      notePluginRegistry.blockPlugins
        .get('heading')
        ?.sideMenu?.inspect?.({ type: 'heading', props: { level: 3 } })
    ).toEqual({ attributes: { level: '3' } });
  });
});

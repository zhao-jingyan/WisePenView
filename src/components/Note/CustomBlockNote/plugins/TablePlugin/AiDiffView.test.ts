/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../../noteEditorComposition';

describe('TablePlugin AiDiffView', () => {
  it('保留表头、列宽、合并单元格和单元格样式', () => {
    const preview = notePluginRegistry.blockPlugins.get('table')?.aiDiff?.renderCandidate(
      {
        type: 'table',
        props: { textColor: 'blue' },
        content: {
          type: 'tableContent',
          columnWidths: [120, 180],
          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: 'tableCell',
                  props: {
                    colspan: 2,
                    rowspan: 1,
                    backgroundColor: 'yellow',
                    textColor: 'red',
                    textAlignment: 'center',
                  },
                  content: [{ type: 'text', text: '标题', styles: {} }],
                },
              ],
            },
            {
              cells: [
                [{ type: 'text', text: '左', styles: {} }],
                [{ type: 'text', text: '右', styles: {} }],
              ],
            },
          ],
        },
      },
      notePluginRegistry
    );

    expect(preview?.matches('.bn-block-content[data-content-type="table"]')).toBe(true);
    expect(preview?.classList.length).toBeGreaterThan(1);
    expect(preview?.querySelector('.tableWrapper')?.classList.length).toBeGreaterThan(1);
    expect(preview?.dataset.textColor).toBe('blue');
    expect(
      [...(preview?.querySelectorAll('col') ?? [])].map((column) => column.getAttribute('style'))
    ).toEqual(['width: 120px;', 'width: 180px;']);

    const header = preview?.querySelector('th');
    expect(header?.colSpan).toBe(2);
    expect(header?.getAttribute('colwidth')).toBe('120,180');
    expect(header?.dataset.backgroundColor).toBe('yellow');
    expect(header?.dataset.textColor).toBe('red');
    expect(header?.dataset.textAlignment).toBe('center');
    expect(header?.textContent).toBe('标题');
    expect([...preview!.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual([
      '左',
      '右',
    ]);
  });

  it('按跨行占位计算标题列', () => {
    const preview = notePluginRegistry.blockPlugins.get('table')?.aiDiff?.renderCandidate(
      {
        type: 'table',
        props: {},
        content: {
          type: 'tableContent',
          columnWidths: [100, 100],
          headerCols: 1,
          rows: [
            {
              cells: [
                {
                  type: 'tableCell',
                  props: { rowspan: 2 },
                  content: [{ type: 'text', text: '标题', styles: {} }],
                },
                [{ type: 'text', text: '第一行', styles: {} }],
              ],
            },
            { cells: [[{ type: 'text', text: '第二行', styles: {} }]] },
          ],
        },
      },
      notePluginRegistry
    );

    const rows = preview?.querySelectorAll('tr');
    expect(rows?.[0]?.querySelectorAll('th')).toHaveLength(1);
    expect(rows?.[0]?.querySelectorAll('td')).toHaveLength(1);
    expect(rows?.[1]?.querySelectorAll('th')).toHaveLength(0);
    expect(rows?.[1]?.querySelector('td')?.textContent).toBe('第二行');
  });
});

import type { NoteAiDiffPreviewData } from '@/domains/Note';

const text = (value: string, styles: Record<string, boolean | string> = {}) => ({
  type: 'text' as const,
  text: value,
  styles,
});

const textBlockProps = () => ({
  backgroundColor: 'default',
  textColor: 'default',
  textAlignment: 'left',
});

function paragraphBlock(id: string, content: string, aiContent: string) {
  return {
    id,
    type: 'paragraph',
    props: textBlockProps(),
    content: [text(content)],
    'ai-content': [text(aiContent)],
    children: [],
  };
}

const tableContent = (rows: string[][]) => ({
  type: 'tableContent' as const,
  columnWidths: [160, 220, 140],
  headerRows: 1,
  rows: rows.map((cells) => ({
    cells: cells.map((cell) => ({
      type: 'tableCell' as const,
      content: [text(cell)],
      props: {
        colspan: 1,
        rowspan: 1,
        backgroundColor: 'default',
        textColor: 'default',
        textAlignment: 'left',
      },
    })),
  })),
});

const copy = {
  inlineSingle: {
    current: '数据口径：本期报告统计工作日内完成的正式请求，排除演练流量、重复提交与人工回放。',
    ai: '数据口径：本期报告统计工作时段内完成的正式请求，排除演练流量、重复提交与人工回放。',
  },
  inlineSparse: {
    current: '容量评估：平均处理时长为 8.1 小时，自动分类覆盖率为 72%，团队将在月底完成首次复盘。',
    ai: '容量评估：平均处理时长为 7.8 小时，自动分类覆盖率为 76%，团队将在月底完成最终复盘。',
  },
  blockRewrite: {
    current: '当前汇总数据说明自动化流程已经稳定降低所有时段的处理成本，可以立即扩大到全部业务线。',
    ai: '分层数据仅证明常规请求在低负载时段缩短了排队时间，高峰期长尾延迟仍然明显，应限制推广范围。',
  },
};

/** 使用 block.content 与 block.ai-content 驱动真实编辑器 AI Diff 预览。 */
export const NOTE_AI_DIFF_PREVIEW_MOCK = {
  content: [
    {
      id: 'mock-ai-diff-heading',
      type: 'heading',
      props: { ...textBlockProps(), level: 2, isToggleable: false },
      content: [text('旧标题：季度研究计划')],
      'ai-content': [text('新标题：第三季度研究与交付计划', { bold: true })],
      children: [],
    },
    paragraphBlock('mock-ai-diff-inline-single', copy.inlineSingle.current, copy.inlineSingle.ai),
    paragraphBlock('mock-ai-diff-inline-sparse', copy.inlineSparse.current, copy.inlineSparse.ai),
    {
      id: 'mock-ai-diff-inline-style',
      type: 'paragraph',
      props: textBlockProps(),
      content: [text('样式调整：重点结论需要在评审前复核。')],
      'ai-content': [
        text('样式调整：'),
        text('重点结论', { bold: true }),
        text('需要在评审前复核。'),
      ],
      children: [],
    },
    paragraphBlock('mock-ai-diff-block-rewrite', copy.blockRewrite.current, copy.blockRewrite.ai),
    {
      id: 'mock-ai-diff-rich-content',
      type: 'paragraph',
      props: textBlockProps(),
      content: [text('当前方案参考 '), text('平均处理时长', { bold: true }), text('。')],
      'ai-content': [
        text('新方案参考 '),
        {
          type: 'link',
          href: 'https://example.com/report',
          content: [text('阶段报告', { underline: true })],
        },
        text('。'),
      ],
      children: [],
    },
    {
      id: 'mock-ai-diff-create',
      type: 'bulletListItem',
      props: textBlockProps(),
      content: [],
      'ai-content': [text('新增：为关键指标补充自动化回归与异常告警。')],
      children: [],
    },
    {
      id: 'mock-ai-diff-delete',
      type: 'quote',
      props: { backgroundColor: 'default', textColor: 'default' },
      content: [text('删除：该结论仍依赖上一版样本，已不再适用。')],
      'ai-content': [],
      children: [],
    },
    {
      id: 'mock-ai-diff-code',
      type: 'codeBlock',
      props: { language: 'typescript' },
      content: [text("const status = 'draft';\nreturn status;")],
      'ai-content': [
        text("const status: 'draft' | 'ready' = 'ready';\nreturn { status, reviewed: true };"),
      ],
      children: [],
    },
    {
      id: 'mock-ai-diff-math',
      type: 'math',
      props: { expression: 'E = mc^2', autoEdit: false },
      'ai-content': 'E_k = \\frac{1}{2}mv^2',
      children: [],
    },
    {
      id: 'mock-ai-diff-table',
      type: 'table',
      props: { textColor: 'default' },
      content: tableContent([
        ['指标', '当前值', '负责人'],
        ['处理时长', '8 小时', '林然'],
        ['覆盖率', '72%', '周宁'],
      ]),
      'ai-content': tableContent([
        ['指标', '目标值', '负责人'],
        ['处理时长', '5 小时', '林然'],
        ['覆盖率', '90%', '周宁'],
        ['自动化率', '85%', '陈默'],
      ]),
      children: [],
    },
  ],
} satisfies NoteAiDiffPreviewData;

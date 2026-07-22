function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Slash Menu 新建 Mermaid 图表时使用的可直接渲染示例。 */
export const DEFAULT_MERMAID_SOURCE = 'flowchart TD\n  A[开始] --> B[结束]';

/** BlockNote 代码内容只取文本节点，图表 DSL 不承载行内格式。 */
export function readMermaidSource(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(isRecord)
    .map((inline) => (typeof inline.text === 'string' ? inline.text : ''))
    .join('');
}

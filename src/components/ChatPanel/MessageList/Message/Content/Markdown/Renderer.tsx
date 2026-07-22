import CodeBlock from '@/components/Code/CodeBlock';
import MermaidBlock from '@/components/Code/MermaidBlock';
import { isMermaidLanguage } from '@/components/Code/MermaidBlock/language';
import type { ParsedBlock, RootContent } from '@incremark/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CornerUpLeft } from 'lucide-react';
import { Fragment, memo, type MouseEvent, type ReactNode } from 'react';
import { MARKDOWN_UNDERLINE_URL, type MarkdownRenderContext } from './runtime';
import styles from './style.module.less';

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i;

type MarkdownDefinitions = MarkdownRenderContext['definitions'];

interface MarkdownBlockProps {
  block: ParsedBlock;
  renderContext: MarkdownRenderContext;
  streaming: boolean;
}

interface MarkdownRendererProps {
  blocks: ParsedBlock[];
  renderContext: MarkdownRenderContext;
  showFootnotes: boolean;
  streaming: boolean;
}

type RuntimeMathNode = { type: 'inlineMath' | 'math'; value: string };

const SUPERSCRIPT_PATTERN = /(?<!\\)\^([^\s^\n](?:[^^\n]*[^\s^\n])?)\^/g;
const HIGHLIGHT_PATTERN = /(?<![=\\])==(?=\S)([\s\S]*?\S)==(?![=])/g;

function renderTextWithSuperscripts(value: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let index = 0;

  while ((match = SUPERSCRIPT_PATTERN.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${key}-text-${index}`}>{value.slice(lastIndex, match.index)}</Fragment>
      );
    }
    nodes.push(
      <sup key={`${key}-sup-${index}`} className={styles.inlineSuperscript}>
        {match[1]}
      </sup>
    );
    lastIndex = match.index + match[0].length;
    index += 1;
  }

  if (lastIndex === 0) return [value];
  if (lastIndex < value.length) {
    nodes.push(<Fragment key={`${key}-text-${index}`}>{value.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

function renderTextWithInlineStyles(value: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let index = 0;

  while ((match = HIGHLIGHT_PATTERN.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${key}-text-${index}`}>
          {renderTextWithSuperscripts(value.slice(lastIndex, match.index), `${key}-${index}`)}
        </Fragment>
      );
    }
    nodes.push(
      <mark key={`${key}-highlight-${index}`} className={styles.inlineHighlight}>
        {renderTextWithSuperscripts(match[1], `${key}-${index}`)}
      </mark>
    );
    lastIndex = match.index + match[0].length;
    index += 1;
  }

  if (lastIndex === 0) return renderTextWithSuperscripts(value, key);
  if (lastIndex < value.length) {
    nodes.push(
      <Fragment key={`${key}-text-${index}`}>
        {renderTextWithSuperscripts(value.slice(lastIndex), `${key}-${index}`)}
      </Fragment>
    );
  }
  return nodes;
}

/** GFM 会先把单波浪数字解析成删除线节点，这里还原为常用下标语义。 */
function readNumericSubscript(node: Extract<RootContent, { type: 'delete' }>): string | undefined {
  const [child] = node.children;
  if (node.children.length !== 1 || child?.type !== 'text') return undefined;
  return /^\d+(?:[.,]\d+)?$/.test(child.value) ? child.value : undefined;
}

/** Incremark 运行时会产出数学节点，但当前公开 RootContent 类型尚未声明它们。 */
function readMathExpression(
  node: RootContent | RuntimeMathNode,
  type: 'inlineMath' | 'math'
): string | undefined {
  return node.type === type && 'value' in node && typeof node.value === 'string'
    ? node.value
    : undefined;
}

function renderMathHtml(expression: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(expression, {
      displayMode,
      output: 'htmlAndMathml',
      throwOnError: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

function renderMathFormula(expression: string, displayMode: boolean, key?: string): ReactNode {
  const html = renderMathHtml(expression, displayMode);

  if (html) {
    return (
      <span
        key={key}
        className={displayMode ? styles.mathBlock : styles.mathInline}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <code key={key} className={styles.mathFallback}>
      {expression}
    </code>
  );
}

/** 保持原有 URL 安全边界，拒绝脚本及 data 等可执行协议。 */
function transformUrl(value: string): string | null {
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');
  const isRelative =
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign);

  if (isRelative || SAFE_PROTOCOL.test(value.slice(0, colon))) return value;
  return null;
}

/** 聊天消息只允许跳转到站外 HTTP(S) 地址，目录锚点和站内路径保持为普通文本。 */
function transformExternalUrl(value: string): string | null {
  const href = transformUrl(value);
  if (!href) return null;

  try {
    const url = new URL(href);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.origin === window.location.origin
    ) {
      return null;
    }
    return href;
  } catch {
    return null;
  }
}

function handleFootnoteNavigation(event: MouseEvent<HTMLAnchorElement>) {
  const { hash } = event.currentTarget;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;

  event.preventDefault();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  });
  window.history.pushState(null, '', hash);
}

function resolveDefinition(
  identifier: string,
  definitions: MarkdownDefinitions
): MarkdownDefinitions[string] | undefined {
  return definitions[identifier] ?? definitions[identifier.toLowerCase()];
}

function renderInlineNodes(
  nodes: readonly RootContent[],
  renderContext: MarkdownRenderContext,
  keyPrefix: string
): ReactNode[] {
  return nodes.map((node, index) => renderInlineNode(node, renderContext, `${keyPrefix}-${index}`));
}

function renderInlineNode(
  node: RootContent,
  renderContext: MarkdownRenderContext,
  key: string
): ReactNode {
  const inlineMathExpression = readMathExpression(node, 'inlineMath');
  if (inlineMathExpression != null) {
    return renderMathFormula(inlineMathExpression, false, key);
  }

  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{renderTextWithInlineStyles(node.value, key)}</Fragment>;
    case 'strong':
      return <strong key={key}>{renderInlineNodes(node.children, renderContext, key)}</strong>;
    case 'emphasis':
      return <em key={key}>{renderInlineNodes(node.children, renderContext, key)}</em>;
    case 'delete': {
      const subscript = readNumericSubscript(node);
      if (subscript != null) {
        return (
          <sub key={key} className={styles.inlineSubscript}>
            {subscript}
          </sub>
        );
      }
      return <del key={key}>{renderInlineNodes(node.children, renderContext, key)}</del>;
    }
    case 'inlineCode':
      return <code key={key}>{node.value}</code>;
    case 'break':
      return <br key={key} />;
    case 'link': {
      const children = renderInlineNodes(node.children, renderContext, key);
      if (node.url === MARKDOWN_UNDERLINE_URL) {
        return (
          <span key={key} className={styles.inlineUnderline}>
            {children}
          </span>
        );
      }
      const href = transformExternalUrl(node.url);
      if (!href) return <Fragment key={key}>{children}</Fragment>;
      return (
        <a key={key} href={href} title={node.title ?? undefined}>
          {children}
        </a>
      );
    }
    case 'linkReference': {
      const definition = resolveDefinition(node.identifier, renderContext.definitions);
      const href = definition ? transformExternalUrl(definition.url) : null;
      const children = renderInlineNodes(node.children, renderContext, key);
      if (!href) return <Fragment key={key}>{children}</Fragment>;
      return (
        <a key={key} href={href} title={definition?.title ?? undefined}>
          {children}
        </a>
      );
    }
    case 'image': {
      const src = transformUrl(node.url);
      if (!src) return <Fragment key={key}>{node.alt ?? ''}</Fragment>;
      return (
        <img
          key={key}
          src={src}
          alt={node.alt ?? ''}
          title={node.title ?? undefined}
          loading="lazy"
        />
      );
    }
    case 'imageReference': {
      const definition = resolveDefinition(node.identifier, renderContext.definitions);
      const src = definition ? transformUrl(definition.url) : null;
      if (!src) return <Fragment key={key}>{node.alt ?? ''}</Fragment>;
      return (
        <img
          key={key}
          src={src}
          alt={node.alt ?? ''}
          title={definition?.title ?? undefined}
          loading="lazy"
        />
      );
    }
    case 'footnoteReference': {
      const fragmentId = encodeURIComponent(node.identifier);
      return (
        <sup key={key} className={styles.footnoteReference}>
          <a
            id={`fnref-${fragmentId}`}
            href={`#fn-${fragmentId}`}
            onClick={handleFootnoteNavigation}
          >
            {node.identifier}
          </a>
        </sup>
      );
    }
    case 'html':
      // 模型输出的原始 HTML 只作为文本展示，不交给浏览器执行。
      return <Fragment key={key}>{node.value}</Fragment>;
    default:
      if ('children' in node && Array.isArray(node.children)) {
        return (
          <Fragment key={key}>{renderInlineNodes(node.children, renderContext, key)}</Fragment>
        );
      }
      if ('value' in node && typeof node.value === 'string') {
        return <Fragment key={key}>{node.value}</Fragment>;
      }
      return null;
  }
}

function renderHeading(
  node: Extract<RootContent, { type: 'heading' }>,
  renderContext: MarkdownRenderContext,
  key: string
): ReactNode {
  const children = renderInlineNodes(node.children, renderContext, key);
  switch (node.depth) {
    case 1:
      return <h1>{children}</h1>;
    case 2:
      return <h2>{children}</h2>;
    case 3:
      return <h3>{children}</h3>;
    case 4:
      return <h4>{children}</h4>;
    case 5:
      return <h5>{children}</h5>;
    case 6:
      return <h6>{children}</h6>;
  }
}

function renderList(
  node: Extract<RootContent, { type: 'list' }>,
  renderContext: MarkdownRenderContext,
  keyPrefix: string,
  streaming: boolean
): ReactNode {
  const items = node.children.map((item, index) => {
    const isTaskItem = typeof item.checked === 'boolean';
    return (
      <li key={`${keyPrefix}-${index}`} className={isTaskItem ? styles.taskListItem : undefined}>
        {isTaskItem ? (
          <input
            type="checkbox"
            checked={item.checked ?? false}
            disabled
            className={styles.taskCheckbox}
          />
        ) : null}
        {item.children.map((child, childIndex) =>
          renderBlockNode(child, renderContext, `${keyPrefix}-${index}-${childIndex}`, streaming)
        )}
      </li>
    );
  });

  if (node.ordered) return <ol start={node.start ?? undefined}>{items}</ol>;
  return <ul>{items}</ul>;
}

function renderTable(
  node: Extract<RootContent, { type: 'table' }>,
  renderContext: MarkdownRenderContext,
  keyPrefix: string
): ReactNode {
  const [head, ...body] = node.children;
  const getAlignClass = (index: number): string | undefined => {
    const align = node.align?.[index];
    if (align === 'center') return styles.tableAlignCenter;
    if (align === 'right') return styles.tableAlignRight;
    if (align === 'left') return styles.tableAlignLeft;
    return undefined;
  };

  return (
    <div className={styles.tableWrapper}>
      <table>
        {head ? (
          <thead>
            <tr>
              {head.children.map((cell, index) => (
                <th key={`${keyPrefix}-head-${index}`} className={getAlignClass(index)}>
                  {renderInlineNodes(cell.children, renderContext, `${keyPrefix}-head-${index}`)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${keyPrefix}-row-${rowIndex}`}>
              {row.children.map((cell, cellIndex) => (
                <td
                  key={`${keyPrefix}-row-${rowIndex}-${cellIndex}`}
                  className={getAlignClass(cellIndex)}
                >
                  {renderInlineNodes(
                    cell.children,
                    renderContext,
                    `${keyPrefix}-row-${rowIndex}-${cellIndex}`
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlockNode(
  node: RootContent,
  renderContext: MarkdownRenderContext,
  key: string,
  streaming: boolean
): ReactNode {
  const mathExpression = readMathExpression(node, 'math');
  if (mathExpression != null) {
    return renderMathFormula(mathExpression, true);
  }

  switch (node.type) {
    case 'paragraph':
      return <p>{renderInlineNodes(node.children, renderContext, key)}</p>;
    case 'heading':
      return renderHeading(node, renderContext, key);
    case 'blockquote':
      return (
        <blockquote>
          {node.children.map((child, index) =>
            renderBlockNode(child, renderContext, `${key}-${index}`, streaming)
          )}
        </blockquote>
      );
    case 'list':
      return renderList(node, renderContext, key, streaming);
    case 'table':
      return renderTable(node, renderContext, key);
    case 'thematicBreak':
      return <hr />;
    case 'code':
      if (isMermaidLanguage(node.lang ?? undefined)) {
        return (
          <MermaidBlock code={node.value} language={node.lang ?? undefined} streaming={streaming} />
        );
      }
      return <CodeBlock code={node.value} language={node.lang ?? undefined} />;
    case 'html':
      return <>{node.value}</>;
    case 'definition':
    case 'footnoteDefinition':
      return null;
    default:
      return renderInlineNode(node, renderContext, key);
  }
}

function MarkdownBlockView({ block, renderContext, streaming }: MarkdownBlockProps) {
  return renderBlockNode(block.node, renderContext, `block-${block.id}`, streaming);
}

const MarkdownBlock = memo(
  MarkdownBlockView,
  (previous, next) =>
    previous.block === next.block &&
    previous.renderContext === next.renderContext &&
    previous.streaming === next.streaming
);

function MarkdownFootnotes({ renderContext }: { renderContext: MarkdownRenderContext }) {
  if (renderContext.footnoteReferenceOrder.length === 0) return null;

  return (
    <section className={styles.footnotes}>
      <hr />
      <ol>
        {renderContext.footnoteReferenceOrder.map((identifier) => {
          const definition = renderContext.footnoteDefinitions[identifier];
          if (!definition) return null;
          const fragmentId = encodeURIComponent(identifier);
          return (
            <li key={identifier} id={`fn-${fragmentId}`}>
              {definition.children.map((child, index) =>
                renderBlockNode(child, renderContext, `footnote-${fragmentId}-${index}`, false)
              )}
              <a
                href={`#fnref-${fragmentId}`}
                aria-label="返回脚注引用"
                onClick={handleFootnoteNavigation}
                className={styles.footnoteBackLink}
              >
                <CornerUpLeft size={12} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function MarkdownRenderer({
  blocks,
  renderContext,
  showFootnotes,
  streaming,
}: MarkdownRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <MarkdownBlock
          key={block.id}
          block={block}
          renderContext={renderContext}
          streaming={streaming}
        />
      ))}
      {showFootnotes ? <MarkdownFootnotes renderContext={renderContext} /> : null}
    </>
  );
}

export default MarkdownRenderer;

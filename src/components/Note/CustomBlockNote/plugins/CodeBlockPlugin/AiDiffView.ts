import { getCodeBlockLanguageLabel } from './language';
import { buildCodeLineDiff, type CodeLineDiffEntry } from './lineDiff';
import styles from './style.module.less';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readLanguage(aiBlock: Record<string, unknown>): string {
  const props = isRecord(aiBlock.props) ? aiBlock.props : {};
  return typeof props.language === 'string' && props.language ? props.language : 'text';
}

function readCode(aiBlock: Record<string, unknown>): string {
  if (typeof aiBlock.content === 'string') return aiBlock.content;
  if (!Array.isArray(aiBlock.content)) return '';
  return aiBlock.content
    .filter(isRecord)
    .map((inline) => (typeof inline.text === 'string' ? inline.text : ''))
    .join('');
}

function createCodeBlockShell(params: {
  language: string;
  languageLabel: string;
  code: HTMLElement;
}): HTMLElement {
  const { language, languageLabel, code } = params;
  const root = document.createElement('div');
  root.className = `bn-block-content ${styles.codeBlockView}`;
  root.contentEditable = 'false';
  root.dataset.contentType = 'codeBlock';
  root.dataset.readOnly = 'true';

  const toolbarWrapper = document.createElement('div');
  toolbarWrapper.className = 'wise-code-block-toolbarWrapper';
  toolbarWrapper.dataset.wiseCodeBlockToolbar = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'wise-code-block-toolbar';
  const languageRoot = document.createElement('div');
  languageRoot.className = 'wise-code-block-language';
  const languageDisplay = document.createElement('div');
  languageDisplay.className = `wise-code-block-languageButton ${styles.readOnlyLanguage}`;
  const label = document.createElement('span');
  label.className = 'wise-code-block-languageLabel';
  label.textContent = languageLabel;
  languageDisplay.appendChild(label);
  languageRoot.appendChild(languageDisplay);
  toolbar.appendChild(languageRoot);
  toolbarWrapper.appendChild(toolbar);

  const pre = document.createElement('pre');
  code.classList.add(`language-${language}`);
  code.dataset.language = language;
  pre.appendChild(code);
  root.append(toolbarWrapper, pre);
  return root;
}

function createLineNumber(entry: CodeLineDiffEntry): HTMLSpanElement {
  const value = entry.kind === 'delete' ? entry.oldLineNumber : entry.newLineNumber;
  const lineNumber = document.createElement('span');
  lineNumber.className = styles.lineNumber;
  lineNumber.textContent = value === undefined ? '' : String(value);
  return lineNumber;
}

function createDiffLine(entry: CodeLineDiffEntry): HTMLSpanElement {
  const line = document.createElement('span');
  line.className = [
    styles.diffLine,
    entry.kind === 'delete' ? styles.deleteLine : '',
    entry.kind === 'insert' ? styles.insertLine : '',
  ]
    .filter(Boolean)
    .join(' ');
  line.dataset.diffKind = entry.kind;
  line.dataset.lineNumber =
    entry.kind === 'delete' ? String(entry.oldLineNumber ?? '') : String(entry.newLineNumber ?? '');

  const marker = document.createElement('span');
  marker.className = styles.lineMarker;
  marker.textContent = entry.kind === 'delete' ? '-' : entry.kind === 'insert' ? '+' : '';
  const content = document.createElement('span');
  content.className = styles.lineContent;
  content.textContent = entry.text || '\u200B';
  line.append(marker, createLineNumber(entry), content);
  return line;
}

/** 使用代码块原生 DOM 契约渲染只读 AI 候选。 */
export function CodeBlockAiContentView(aiBlock: Record<string, unknown>): HTMLElement {
  const language = readLanguage(aiBlock);
  const code = document.createElement('code');
  code.className = styles.plainCode;
  code.textContent = readCode(aiBlock);
  return createCodeBlockShell({
    language,
    languageLabel: getCodeBlockLanguageLabel(language),
    code,
  });
}

/** 对比模式隐藏原代码块，改为在同一个代码块内逐行展示新旧差异。 */
export function CodeBlockAiDiffComparisonView(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>
): HTMLElement {
  const aiLanguage = readLanguage(aiBlock);
  const code = document.createElement('code');
  code.className = styles.lineList;
  buildCodeLineDiff(readCode(current), readCode(aiBlock)).forEach((entry) => {
    code.appendChild(createDiffLine(entry));
  });
  return createCodeBlockShell({
    language: aiLanguage,
    languageLabel: getCodeBlockLanguageLabel(aiLanguage),
    code,
  });
}

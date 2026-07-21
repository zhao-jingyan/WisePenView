import {
  normalizeCodeLanguage,
  tokenizeCodeLines,
  type CodeHighlightToken,
} from '@/utils/codeHighlight';
import { useRequest } from 'ahooks';
import { type CSSProperties, type ReactNode } from 'react';
import CopyButton from '../../CopyButton';
import styles from './CodeBlock.module.less';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function getTokenStyle(token: CodeHighlightToken): CSSProperties {
  const fontStyle = token.fontStyle ?? 0;
  return {
    color: token.color,
    fontStyle: fontStyle & 1 ? 'italic' : undefined,
    fontWeight: fontStyle & 2 ? 700 : undefined,
    textDecoration: fontStyle & 4 ? 'underline' : undefined,
  };
}

function renderHighlightedCode(code: string, tokens: readonly CodeHighlightToken[][]): ReactNode {
  return code.split('\n').map((line, lineIndex) => {
    const lineTokens = tokens[lineIndex];
    return (
      <span key={`${lineIndex}-${line}`} className={styles.codeLine}>
        {lineTokens?.length
          ? lineTokens.map((token, tokenIndex) => (
              <span key={`${tokenIndex}-${token.content}`} style={getTokenStyle(token)}>
                {token.content}
              </span>
            ))
          : line || '\u200B'}
      </span>
    );
  });
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const codeLanguage = normalizeCodeLanguage(language);
  const { data: highlighted } = useRequest(
    async () => ({ language: codeLanguage, tokens: await tokenizeCodeLines(code, codeLanguage) }),
    { refreshDeps: [code, codeLanguage] }
  );
  const tokens = highlighted?.language === codeLanguage ? highlighted.tokens : undefined;

  return (
    <div className={styles.shell}>
      <span className={styles.language}>{codeLanguage}</span>
      <CopyButton text={code} label="复制代码块" className={styles.copyButton} />
      <pre className={styles.pre}>
        <code className={`language-${codeLanguage}`}>
          {tokens?.length ? renderHighlightedCode(code, tokens) : code}
        </code>
      </pre>
    </div>
  );
}

export default CodeBlock;

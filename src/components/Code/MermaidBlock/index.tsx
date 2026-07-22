import { CodeBlockFrame, HighlightedCode } from '@/components/Code/CodeBlock';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useRequest } from 'ahooks';
import { useId, useState } from 'react';
import { renderMermaidDiagram } from './mermaidRuntime';
import styles from './style.module.less';

type MermaidView = 'code' | 'graph';

interface MermaidBlockProps {
  code: string;
  language?: string;
  streaming: boolean;
}

function readRenderError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '图形渲染失败，请检查 Mermaid 语法。';
}

function MermaidBlock({ code, language, streaming }: MermaidBlockProps) {
  const [view, setView] = useState<MermaidView>('graph');
  const diagramId = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shouldRender = view === 'graph' && !streaming;
  const { data: rendered, loading } = useRequest(
    async () => {
      try {
        return { source: code, svg: await renderMermaidDiagram(diagramId, code) };
      } catch (error) {
        return { source: code, error: readRenderError(error) };
      }
    },
    { ready: shouldRender, refreshDeps: [code, diagramId, shouldRender] }
  );
  const result = rendered?.source === code ? rendered : undefined;

  return (
    <CodeBlockFrame
      code={code}
      language={language}
      actions={
        <SegmentedTabs
          ariaLabel="Mermaid 展示模式"
          items={[
            { key: 'code', label: '代码' },
            { key: 'graph', label: '图形' },
          ]}
          selectedKey={view}
          onSelectionChange={(key) => setView(key as MermaidView)}
          size="sm"
          className={styles.tabs}
        />
      }
    >
      {view === 'code' || streaming ? <HighlightedCode code={code} language={language} /> : null}
      {shouldRender && loading ? <div className={styles.status}>正在渲染图形...</div> : null}
      {shouldRender && result?.error ? <div className={styles.error}>{result.error}</div> : null}
      {shouldRender && result?.svg ? (
        <div className={styles.graph}>
          <div className={styles.svg} dangerouslySetInnerHTML={{ __html: result.svg }} />
        </div>
      ) : null}
    </CodeBlockFrame>
  );
}

export default MermaidBlock;

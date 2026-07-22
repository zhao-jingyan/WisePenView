import { useUpdateEffect } from 'ahooks';
import { useState } from 'react';
import MarkdownRenderer from './Renderer';
import { createMarkdownRuntime, updateMarkdownRuntime } from './runtime';
import styles from './style.module.less';

interface MarkdownContentProps {
  content: string;
  streaming: boolean;
}

function MarkdownContent({ content, streaming }: MarkdownContentProps) {
  const [runtime] = useState(() => createMarkdownRuntime(content, streaming));
  const [snapshot, setSnapshot] = useState(runtime.snapshot);

  useUpdateEffect(() => {
    const nextSnapshot = updateMarkdownRuntime(runtime, content, streaming);
    if (nextSnapshot) setSnapshot(nextSnapshot);
  }, [content, streaming]);

  return (
    <div className={styles.markdown}>
      <MarkdownRenderer
        blocks={snapshot.blocks}
        renderContext={snapshot.renderContext}
        showFootnotes={!streaming}
        streaming={streaming}
      />
    </div>
  );
}

export default MarkdownContent;

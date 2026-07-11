import { Spin } from '@/components/Feedback';
import { Marker, MarkerContent, MarkerIcon } from '@/components/_shadcn';
import markerStyles from '@/components/_shadcn/marker.module.less';
import { Wrench } from 'lucide-react';
import styles from './ToolCallBlock.module.less';

interface ToolCallBlockProps {
  content: string;
  loading?: boolean;
}

function ToolCallBlock({ content, loading = false }: ToolCallBlockProps) {
  if (!content && !loading) return null;

  const toolNames = Array.from(
    new Set(
      content
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
  const displayText = toolNames.join('、');

  if (loading && !displayText) {
    return (
      <div className={styles.wrapper}>
        <Marker role="status">
          <MarkerIcon>
            <Spin size="small" />
          </MarkerIcon>
          <MarkerContent className={markerStyles.shimmer}>正在调用工具...</MarkerContent>
        </Marker>
      </div>
    );
  }

  if (!displayText) return null;

  return (
    <div className={styles.wrapper}>
      <Marker variant="border">
        <MarkerIcon>
          <Wrench />
        </MarkerIcon>
        <MarkerContent>调用工具：{displayText}</MarkerContent>
      </Marker>
    </div>
  );
}

export default ToolCallBlock;

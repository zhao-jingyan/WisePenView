import { Spin } from '@/components/Feedback';
import { Marker, MarkerContent, MarkerIcon } from '@/components/_shadcn';
import markerStyles from '@/components/_shadcn/marker.module.less';
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { AlertCircle, Ban, Check, Clock, Wrench } from 'lucide-react';
import styles from './ToolCallBlock.module.less';

type RenderableToolPart = ToolUIPart | DynamicToolUIPart;

function getToolStatus(part: RenderableToolPart): { label: string; loading: boolean } {
  switch (part.state) {
    case 'input-streaming':
      return { label: '正在准备工具输入', loading: true };
    case 'input-available':
      return { label: '正在调用工具', loading: true };
    case 'approval-requested':
      return { label: '等待批准', loading: false };
    case 'approval-responded':
      return { label: part.approval.approved ? '已批准' : '未批准', loading: false };
    case 'output-available':
      return { label: '调用完成', loading: false };
    case 'output-error':
      return { label: part.errorText || '调用失败', loading: false };
    case 'output-denied':
      return { label: '调用被拒绝', loading: false };
  }
}

function ToolCallBlock({ part }: { part: RenderableToolPart }) {
  const status = getToolStatus(part);
  return (
    <div className={styles.wrapper} data-tool-call-id={part.toolCallId}>
      <Marker variant="border" role="status">
        <MarkerIcon>
          {status.loading ? (
            <Spin size="small" />
          ) : part.state === 'output-available' ? (
            <Check />
          ) : part.state === 'output-denied' ? (
            <Ban />
          ) : part.state === 'output-error' ? (
            <AlertCircle />
          ) : part.state === 'approval-requested' ? (
            <Clock />
          ) : (
            <Wrench />
          )}
        </MarkerIcon>
        <MarkerContent className={status.loading ? markerStyles.shimmer : undefined}>
          {getToolName(part)}：{status.label}
        </MarkerContent>
      </Marker>
    </div>
  );
}

export default ToolCallBlock;

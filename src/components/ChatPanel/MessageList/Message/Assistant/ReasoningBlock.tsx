import { useEffectForce } from '@/hooks/useEffectForce';
import { ChevronRight, Loader } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMessageScrollFollow } from '../../useMessageScrollFollow';
import styles from './ReasoningBlock.module.less';

interface ReasoningBlockProps {
  content: string;
  loading: boolean;
}

function ReasoningBlock({ content, loading }: ReasoningBlockProps) {
  const [collapsed, setCollapsed] = useState(!loading);
  const previousLoadingRef = useRef(loading);
  const { scheduleScrollToEnd } = useMessageScrollFollow();
  const open = loading || !collapsed;

  /**
   * 推理流结束会同步更新区块状态并开始渲染后续正文，二者在同一批次时可能错过 scroller 的尺寸观察。
   * 下滚时是否保留用户当前阅读位置由消息滚动控制器统一处理。
   */
  useEffectForce(() => {
    const completed = previousLoadingRef.current && !loading;
    previousLoadingRef.current = loading;

    if (completed) scheduleScrollToEnd();
  }, [loading, scheduleScrollToEnd]);

  if (!content && !loading) return null;

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span className={styles.label}>
          {loading ? <Loader className={styles.loadingIcon} aria-hidden="true" /> : null}
          {loading ? '深度思考中...' : '思考过程'}
        </span>
        <ChevronRight className={styles.expandIcon} size={14} aria-hidden="true" />
      </button>
      {open ? <blockquote className={styles.content}>{content}</blockquote> : null}
    </div>
  );
}

export default ReasoningBlock;

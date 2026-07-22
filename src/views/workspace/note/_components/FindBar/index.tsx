import { useMount } from 'ahooks';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useRef } from 'react';

import type { NoteFindResult } from '@/components/Note/CustomBlockNote/index.type';

import styles from './style.module.less';

interface FindBarProps {
  query: string;
  result: NoteFindResult | null;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

function formatResult(result: NoteFindResult | null): string {
  if (!result) return '无匹配';
  return `${result.current} / ${result.total}`;
}

function FindBar({ query, result, onQueryChange, onPrevious, onNext, onClose }: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 挂载时聚焦输入框。
  useMount(() => {
    inputRef.current?.focus();
  });

  const isNavigationDisabled = result === null;

  return (
    <div className={styles.root} role="search" aria-label="笔记内搜索">
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={query}
        placeholder="在笔记中搜索..."
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <span className={styles.count} aria-live="polite">
        {formatResult(result)}
      </span>
      <button
        className={styles.navBtn}
        type="button"
        aria-label="上一个匹配"
        disabled={isNavigationDisabled}
        onClick={onPrevious}
      >
        <ChevronUp size={16} />
      </button>
      <button
        className={styles.navBtn}
        type="button"
        aria-label="下一个匹配"
        disabled={isNavigationDisabled}
        onClick={onNext}
      >
        <ChevronDown size={16} />
      </button>
      <button className={styles.navBtn} type="button" aria-label="关闭搜索" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

export default FindBar;

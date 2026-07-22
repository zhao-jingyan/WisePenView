import { useMount } from 'ahooks';
import { ChevronDown, ChevronUp, Replace, ReplaceAll, X } from 'lucide-react';
import { useRef } from 'react';

import AppIconButton from '@/components/Button/AppIconButton';
import type { NoteFindResult } from '@/components/Note/CustomBlockNote/index.type';

import styles from './style.module.less';

interface FindBarProps {
  query: string;
  replacement: string;
  result: NoteFindResult | null;
  replaced: number;
  canReplace: boolean;
  onQueryChange: (query: string) => void;
  onReplacementChange: (replacement: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

function formatResult(result: NoteFindResult | null): string {
  if (!result) return '无匹配';
  return `${result.current} / ${result.total}`;
}

function FindBar({
  query,
  replacement,
  result,
  replaced,
  canReplace,
  onQueryChange,
  onReplacementChange,
  onPrevious,
  onNext,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 挂载时聚焦输入框。
  useMount(() => {
    inputRef.current?.focus();
  });

  const isNavigationDisabled = result === null;

  return (
    <div className={styles.root} role="search" aria-label="笔记内搜索">
      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            placeholder="查找"
            aria-label="查找"
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <span className={styles.count} aria-live="polite">
            {formatResult(result)}
          </span>
        </div>
        <div className={styles.fieldRow}>
          <input
            className={styles.input}
            type="text"
            value={replacement}
            placeholder="替换"
            aria-label="替换为"
            disabled={!canReplace}
            onChange={(e) => onReplacementChange(e.target.value)}
          />
          <span className={styles.replaceCount} aria-live="polite">
            {replaced > 0 ? `已替换 ${replaced} 处` : ''}
          </span>
        </div>
      </div>
      <div className={styles.navigationControls}>
        <AppIconButton
          icon={<ChevronUp size={16} />}
          label="上一个匹配"
          isDisabled={isNavigationDisabled}
          onPress={onPrevious}
          tooltip={{ placement: 'left' }}
        />
        <AppIconButton
          icon={<ChevronDown size={16} />}
          label="下一个匹配"
          isDisabled={isNavigationDisabled}
          onPress={onNext}
          tooltip={{ placement: 'left' }}
        />
      </div>
      <div className={styles.replaceControls}>
        <AppIconButton
          icon={<Replace size={16} />}
          label="替换当前"
          isDisabled={isNavigationDisabled || !canReplace}
          onPress={onReplaceCurrent}
          tooltip={{ placement: 'left' }}
        />
        <AppIconButton
          icon={<ReplaceAll size={16} />}
          label="全部替换"
          isDisabled={isNavigationDisabled || !canReplace}
          onPress={onReplaceAll}
          tooltip={{ placement: 'left' }}
        />
      </div>
      <AppIconButton
        icon={<X size={16} />}
        label="关闭搜索"
        onPress={onClose}
        tooltip={{ placement: 'left' }}
      />
    </div>
  );
}

export default FindBar;

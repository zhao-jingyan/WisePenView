import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import type {
  SkillSaveQueueDockProps,
  SkillSaveQueueItem,
  SkillSaveQueuePhase,
} from './index.type';
import styles from './style.module.less';

type QueueMode = 'idle' | 'pending' | 'saving' | 'failed';

const DEFAULT_QUEUE_BODY_HEIGHT = 168;
const MIN_QUEUE_BODY_HEIGHT = 88;
const MAX_QUEUE_BODY_HEIGHT = 360;

function isActivePhase(phase: SkillSaveQueuePhase): boolean {
  return phase === 'preparing' || phase === 'uploading';
}

function clampHeight(value: number): number {
  return Math.min(MAX_QUEUE_BODY_HEIGHT, Math.max(MIN_QUEUE_BODY_HEIGHT, value));
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveQueueMode(items: SkillSaveQueueItem[]): QueueMode {
  if (items.length === 0) return 'idle';
  if (items.some((item) => item.phase === 'failed')) return 'failed';
  if (items.some((item) => isActivePhase(item.phase))) return 'saving';
  return 'pending';
}

function resolveQueueTitle(mode: QueueMode, items: SkillSaveQueueItem[]): string {
  if (mode === 'idle') return '保存队列';
  if (mode === 'failed') {
    const failedCount = items.filter((item) => item.phase === 'failed').length;
    return `${failedCount} 项保存失败`;
  }
  if (mode === 'saving') {
    const doneCount = items.filter((item) => item.phase === 'done').length;
    return `保存中 ${doneCount}/${items.length}`;
  }
  return `待保存 ${items.length} 项`;
}

function resolveQueueHint(mode: QueueMode): string {
  if (mode === 'idle') return '无待处理事项';
  if (mode === 'failed') return '可重试或放弃更改';
  if (mode === 'saving') return '请勿关闭页面';
  return '点击保存后上传';
}

function resolveQueueProgress(items: SkillSaveQueueItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + clampProgress(item.progress), 0);
  return clampProgress(total / items.length);
}

function resolvePhaseText(item: SkillSaveQueueItem): string {
  if (item.phase === 'pending') return '待保存';
  if (item.phase === 'preparing') return '准备中';
  if (item.phase === 'uploading') return `${clampProgress(item.progress)}%`;
  if (item.phase === 'done') return '完成';
  return item.errorMessage ?? '失败';
}

function QueuePhaseIcon({ item }: { item: SkillSaveQueueItem }) {
  if (item.phase === 'done') return <CheckCircle2 size={13} />;
  if (item.phase === 'failed') return <AlertCircle size={13} />;
  if (isActivePhase(item.phase)) return <LoaderCircle className={styles.spinningIcon} size={13} />;
  return <Clock3 size={13} />;
}

function SkillSaveQueueDock({ items, onRetry }: SkillSaveQueueDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(DEFAULT_QUEUE_BODY_HEIGHT);
  const resizeStateRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const mode = resolveQueueMode(items);
  const progress = resolveQueueProgress(items);
  const canRetry = mode === 'failed' && Boolean(onRetry);

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    setExpanded(true);
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: bodyHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    setBodyHeight(clampHeight(resizeState.startHeight + resizeState.startY - event.clientY));
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    resizeStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 12;
    if (event.key === 'ArrowUp') {
      setExpanded(true);
      setBodyHeight((height) => clampHeight(height + step));
      event.preventDefault();
    }
    if (event.key === 'ArrowDown') {
      setExpanded(true);
      setBodyHeight((height) => clampHeight(height - step));
      event.preventDefault();
    }
    if (event.key === 'Home') {
      setExpanded(true);
      setBodyHeight(MIN_QUEUE_BODY_HEIGHT);
      event.preventDefault();
    }
    if (event.key === 'End') {
      setExpanded(true);
      setBodyHeight(MAX_QUEUE_BODY_HEIGHT);
      event.preventDefault();
    }
  };

  return (
    <section
      className={`${styles.queueDock} ${expanded ? styles.queueDockExpanded : ''}`}
      aria-live="polite"
    >
      <div
        className={styles.resizeHandle}
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整保存队列高度"
        aria-valuemin={MIN_QUEUE_BODY_HEIGHT}
        aria-valuemax={MAX_QUEUE_BODY_HEIGHT}
        aria-valuenow={bodyHeight}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onLostPointerCapture={() => {
          resizeStateRef.current = null;
        }}
        onKeyDown={handleResizeKeyDown}
      />
      <div className={styles.queueHeader}>
        <button
          type="button"
          className={styles.queueToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronRight
            className={`${styles.chevronIcon} ${expanded ? styles.chevronIconExpanded : ''}`}
            size={15}
            aria-hidden="true"
          />
          <span className={styles.queueTitle}>
            <strong>{resolveQueueTitle(mode, items)}</strong>
            <span>{resolveQueueHint(mode)}</span>
          </span>
        </button>
        <span className={styles.queueMeta}>
          {mode === 'saving' ? `${progress}%` : null}
          {canRetry ? (
            <button type="button" className={styles.retryButton} onClick={() => onRetry?.()}>
              <RefreshCw size={12} />
              <span>重试</span>
            </button>
          ) : null}
        </span>
      </div>

      {mode === 'saving' || mode === 'failed' ? (
        <div className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {expanded ? (
        <div className={styles.queueBody} style={{ height: bodyHeight }}>
          {items.length === 0 ? (
            <div className={styles.emptyItem}>当前没有等待保存或上传的文件</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.queueItem}>
                <span
                  className={`${styles.itemIcon} ${
                    item.phase === 'failed' ? styles.itemIconFailed : ''
                  }`}
                  aria-hidden="true"
                >
                  <QueuePhaseIcon item={item} />
                </span>
                <span className={styles.itemText}>
                  <strong title={item.name}>{item.name}</strong>
                  <small title={item.path}>{item.path}</small>
                </span>
                <span
                  className={`${styles.itemPhase} ${
                    item.phase === 'failed' ? styles.itemPhaseFailed : ''
                  }`}
                  title={resolvePhaseText(item)}
                >
                  {resolvePhaseText(item)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

export default SkillSaveQueueDock;

import type { WisepenProvider } from '@/domains/Note';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useCallback, useRef } from 'react';
import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../../../blockNoteSchema';
import type { NotePluginRegistry } from '../../../types';
import { normalizeAiGeneratedBlocks } from '../normalizeGeneratedBlocks';
import { hasAiDiffInBlock } from '../presence';
import { aiProtoBlocksToAiGeneratedBlocks } from '../protocol';
import {
  AI_CONTENT_STORE_MAP,
  AI_DIFF_NORMALIZATION_ORIGIN,
  isAiDiffNormalizationLeader,
  readAiContentProtoBlocks,
  removeAiContentPayloads,
  writeMappedBlock,
} from './adapter';

interface NormalizationAwareness {
  clientID: number;
  getStates: () => Map<number, unknown>;
  on: (event: 'change', listener: () => void) => void;
  off: (event: 'change', listener: () => void) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findBlockById(blocks: readonly unknown[], id: string): unknown | null {
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.id === id) return block;
    if (Array.isArray(block.children)) {
      const nested = findBlockById(block.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

export function useAiDiffNormalization(params: {
  doc: Y.Doc;
  noteFragment: Y.XmlFragment;
  editor: CustomBlockNoteEditor;
  provider: WisepenProvider;
  registry: NotePluginRegistry;
  onNormalized: () => void;
}): void {
  const { doc, noteFragment, editor, provider, registry, onNormalized } = params;
  const awareness = provider.awareness as NormalizationAwareness;
  const queuedTimerRef = useRef<number | null>(null);

  const normalize = useCallback(() => {
    if (!provider.synced) return;
    if (!isAiDiffNormalizationLeader(awareness.clientID, awareness.getStates().keys())) return;
    const protoBlocks = readAiContentProtoBlocks(doc, noteFragment);
    if (protoBlocks.length === 0) return;

    const cleanupOnlyIds = new Set<string>();
    const mappedBlocks = new Map<string, Record<string, unknown>>();
    for (const protoBlock of protoBlocks) {
      const id = typeof protoBlock.id === 'string' ? protoBlock.id : '';
      if (!id) continue;
      if (hasAiDiffInBlock(findBlockById(editor.document, id), registry)) {
        cleanupOnlyIds.add(id);
        continue;
      }
      const generated = aiProtoBlocksToAiGeneratedBlocks([protoBlock], registry);
      const mapped = generated ? normalizeAiGeneratedBlocks(generated, registry)?.[0] : null;
      if (isRecord(mapped)) mappedBlocks.set(id, mapped);
    }

    let changed = false;
    doc.transact(() => {
      if (cleanupOnlyIds.size > 0) {
        changed = removeAiContentPayloads(doc, noteFragment, cleanupOnlyIds) || changed;
      }
      const consumedIds = new Set<string>();
      for (const [id, mappedBlock] of mappedBlocks) {
        if (writeMappedBlock(noteFragment, id, mappedBlock)) {
          consumedIds.add(id);
          changed = true;
        }
      }
      if (consumedIds.size > 0) {
        changed = removeAiContentPayloads(doc, noteFragment, consumedIds) || changed;
      }
    }, AI_DIFF_NORMALIZATION_ORIGIN);

    if (changed) window.requestAnimationFrame(onNormalized);
  }, [awareness, doc, editor, noteFragment, onNormalized, provider, registry]);

  /**
   * 执行时机：后端或协同客户端向正文/AI-content store 写入待审阅内容时调度规范化。
   * 不可替代原因：Yjs 变更来自外部协同事务，无法由本地交互事件或派生状态驱动。
   * cleanup：移除 Yjs/awareness/provider 监听并取消未执行的定时任务，避免旧文档被继续改写。
   */
  useEffectForce(() => {
    const aiContentStore = doc.getMap(AI_CONTENT_STORE_MAP);
    const scheduleNormalize = () => {
      if (queuedTimerRef.current !== null) window.clearTimeout(queuedTimerRef.current);
      queuedTimerRef.current = window.setTimeout(() => {
        queuedTimerRef.current = null;
        normalize();
      }, 100);
    };
    noteFragment.observeDeep(scheduleNormalize);
    aiContentStore.observe(scheduleNormalize);
    awareness.on('change', scheduleNormalize);
    provider.on('sync', scheduleNormalize);
    scheduleNormalize();
    return () => {
      noteFragment.unobserveDeep(scheduleNormalize);
      aiContentStore.unobserve(scheduleNormalize);
      awareness.off('change', scheduleNormalize);
      provider.off('sync', scheduleNormalize);
      if (queuedTimerRef.current !== null) {
        window.clearTimeout(queuedTimerRef.current);
        queuedTimerRef.current = null;
      }
    };
  }, [awareness, doc, normalize, noteFragment, provider]);
}

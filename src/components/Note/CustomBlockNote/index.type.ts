import type { Doc } from 'yjs';

import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import type { AiDiffDisplayMode, WisepenProvider } from '@/domains/Note';

export interface NoteBodyEditorHandle {
  focus: () => void;
  navigateToBlock: (id: string) => void;
  /** 通过系统打印对话框另存为 PDF（克隆 DOM + 打印前临时仅旧文本） */
  exportPdf: (options?: { title?: string; titleRoot?: HTMLElement | null }) => Promise<void>;
  /** 下载正文为 Markdown（AIDiff 按仅旧文本过滤后导出） */
  downloadMarkdown: (fileName?: string) => Promise<void>;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: WisepenProvider;
  aiDiffDisplayMode: AiDiffDisplayMode;
  readOnly?: boolean;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
  onAiDiffPresenceChange?: (hasAiDiffContent: boolean) => void;
}

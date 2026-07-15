/* eslint-disable react-refresh/only-export-components -- Provider 与读取 hook 必须共享同一个运行时 Context。 */
import { createContext, createElement, use, type ReactNode } from 'react';

import type { NoteInlineCommentAnchor } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

export interface ContentInlineCommentTarget {
  ownerId: string;
  anchor: NoteInlineCommentAnchor;
}

export interface StartContentInlineCommentOptions extends ContentInlineCommentTarget {
  referenceText: string;
}

export interface UpdateContentInlineCommentReferenceOptions extends ContentInlineCommentTarget {
  referenceText: string;
  persist?: boolean;
}

export interface NoteInlineCommentRuntime {
  canInlineComment: boolean;
  startContentInlineComment: (options: StartContentInlineCommentOptions) => void;
  updateContentInlineCommentReference: (
    options: UpdateContentInlineCommentReferenceOptions
  ) => void;
  clearContentInlineCommentReferenceOverride: (target: ContentInlineCommentTarget) => void;
  selectedThreadId?: string;
  editor: CustomBlockNoteEditor;
  hasActiveContentInlineComment: (target: ContentInlineCommentTarget) => boolean;
  isContentThreadSelected: (target: ContentInlineCommentTarget) => boolean;
  getThreadContentInlineCommentAnchor: (threadId: string) => ContentInlineCommentTarget | undefined;
}

const NoteInlineCommentRuntimeContext = createContext<NoteInlineCommentRuntime | null>(null);

export function NoteInlineCommentRuntimeProvider({
  children,
  ...value
}: NoteInlineCommentRuntime & { children: ReactNode }) {
  return createElement(NoteInlineCommentRuntimeContext.Provider, { value }, children);
}

export function useNoteInlineCommentRuntime() {
  return use(NoteInlineCommentRuntimeContext);
}

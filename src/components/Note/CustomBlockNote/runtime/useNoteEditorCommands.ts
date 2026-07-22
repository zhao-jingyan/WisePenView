import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { TextSelection } from '@tiptap/pm/state';
import { useMemoizedFn } from 'ahooks';
import { useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import { exportNoteMarkdown } from '../engines/markdown/markdownExport';
import { printNotePdfViaBrowser, waitForEditorPaint } from '../engines/print/noteBrowserPrint';
import {
  collectSearchMatches,
  findActiveSearchMatchElement,
  getSearchMatchIndexAtPosition,
  searchPluginKey,
  type SearchExtensionMeta,
} from '../engines/search/extension';
import type { NoteBodyEditorHandle, NoteFindResult } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';
import type { NoteScrollTargetResolver } from './useNoteEditorScroll';

type NoteEditorCommands = Omit<NoteBodyEditorHandle, 'scrollToAnchor'>;

export function useNoteEditorCommands(
  editor: CustomBlockNoteEditor,
  setExportDisplayModeOverride: Dispatch<SetStateAction<AiDiffDisplayMode | null>>,
  scrollToTarget: (resolveTarget: NoteScrollTargetResolver) => void
): NoteEditorCommands {
  const originalFindSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const dispatchSearchMeta = useMemoizedFn((meta: SearchExtensionMeta) => {
    const view = editor.prosemirrorView;
    view.dispatch(view.state.tr.setMeta(searchPluginKey, meta).setMeta('addToHistory', false));
  });

  const clearFind = useMemoizedFn(() => {
    const view = editor.prosemirrorView;

    dispatchSearchMeta({ query: '', matches: [], activeIndex: -1 });

    if (originalFindSelectionRef.current) {
      const { from, to } = originalFindSelectionRef.current;
      const doc = view.state.doc;
      if (from <= doc.content.size && to <= doc.content.size) {
        const tr = view.state.tr;
        tr.setSelection(TextSelection.create(doc, from, to));
        view.dispatch(tr);
      }
    }

    originalFindSelectionRef.current = null;
  });

  const findMatches = useMemoizedFn((query: string): NoteFindResult | null => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearFind();
      return null;
    }

    const view = editor.prosemirrorView;
    const doc = view.state.doc;

    if (!originalFindSelectionRef.current) {
      originalFindSelectionRef.current = {
        from: view.state.selection.from,
        to: view.state.selection.to,
      };
    }

    const matches = collectSearchMatches(doc, trimmedQuery);

    if (matches.length > 0) {
      const activeIndex = getSearchMatchIndexAtPosition(matches, view.state.selection.from);
      const activeMatch = matches[activeIndex];
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: trimmedQuery,
        matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, activeMatch.from, activeMatch.to));
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
      return { current: activeIndex + 1, total: matches.length };
    } else {
      dispatchSearchMeta({ query: trimmedQuery, matches: [], activeIndex: -1 });
    }

    return null;
  });

  const findNext = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = (state.activeIndex + 1) % state.matches.length;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    return { current: activeIndex + 1, total: state.matches.length };
  });

  const findPrev = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = state.activeIndex <= 0 ? state.matches.length - 1 : state.activeIndex - 1;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    return { current: activeIndex + 1, total: state.matches.length };
  });

  return useMemo(
    () => ({
      focus: () => {
        editor.focus();
      },
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, notePluginRegistry, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
        }
      },
      exportMarkdown: () => ({
        content: exportNoteMarkdown(
          editor,
          notePluginRegistry,
          editor.document,
          AI_DIFF_DISPLAY_MODE.OLD_ONLY
        ),
        mimeType: 'text/markdown;charset=utf-8',
        extension: 'md',
      }),
      findMatches,
      findNext,
      findPrev,
      clearFind,
    }),
    [editor, setExportDisplayModeOverride, findMatches, findNext, findPrev, clearFind]
  );
}

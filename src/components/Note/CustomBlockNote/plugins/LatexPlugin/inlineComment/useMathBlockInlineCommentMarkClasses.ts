import { CommentsExtension } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useMount, useUpdateEffect } from 'ahooks';
import { useState } from 'react';

import type {
  ContentInlineCommentTarget,
  NoteInlineCommentRuntime,
} from '../../../engines/inlineComment/runtime/InlineCommentRuntime';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

type UseMathBlockInlineCommentHighlightOptions = {
  inlineCommentEditor: CustomBlockNoteEditor;
  target: ContentInlineCommentTarget;
  revisionKey: string;
  inlineCommentRuntime: NoteInlineCommentRuntime | null;
};

/** math 块无法挂 PM CommentMark，用与 bn-thread-mark 同色值由组件样式承担高亮 */
export function useMathBlockInlineCommentHighlight({
  inlineCommentEditor,
  target,
  revisionKey,
  inlineCommentRuntime,
}: UseMathBlockInlineCommentHighlightOptions): {
  hasInlineComment: boolean;
  selected: boolean;
} {
  const { selectedThreadId } = useExtensionState(CommentsExtension, {
    editor: inlineCommentEditor,
  });
  const [measureRevision, setMeasureRevision] = useState(0);

  useMount(() =>
    inlineCommentEditor.onChange(() => setMeasureRevision((revision) => revision + 1))
  );

  useUpdateEffect(() => {
    setMeasureRevision((revision) => revision + 1);
  }, [revisionKey, selectedThreadId]);

  void measureRevision;

  const hasInlineComment = inlineCommentRuntime?.hasActiveContentInlineComment(target) ?? false;
  const selected = inlineCommentRuntime?.isContentThreadSelected(target) ?? false;

  return { hasInlineComment, selected };
}

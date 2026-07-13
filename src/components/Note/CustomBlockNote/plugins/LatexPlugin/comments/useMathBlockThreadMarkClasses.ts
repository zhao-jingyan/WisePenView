import { CommentsExtension } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useMount, useUpdateEffect } from 'ahooks';
import { useState } from 'react';

import type {
  ContentCommentTarget,
  NoteCommentRuntime,
} from '../../../engines/comments/runtime/CommentRuntime';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

type UseMathBlockCommentHighlightOptions = {
  commentEditor: CustomBlockNoteEditor;
  target: ContentCommentTarget;
  revisionKey: string;
  comments: NoteCommentRuntime | null;
};

/** math 块无法挂 PM CommentMark，用与 bn-thread-mark 同色值由组件样式承担高亮 */
export function useMathBlockCommentHighlight({
  commentEditor,
  target,
  revisionKey,
  comments,
}: UseMathBlockCommentHighlightOptions): { commented: boolean; selected: boolean } {
  const { selectedThreadId } = useExtensionState(CommentsExtension, { editor: commentEditor });
  const [measureRevision, setMeasureRevision] = useState(0);

  useMount(() => commentEditor.onChange(() => setMeasureRevision((revision) => revision + 1)));

  useUpdateEffect(() => {
    setMeasureRevision((revision) => revision + 1);
  }, [revisionKey, selectedThreadId]);

  void measureRevision;

  const commented = comments?.hasActiveContentComment(target) ?? false;
  const selected = comments?.isContentThreadSelected(target) ?? false;

  return { commented, selected };
}

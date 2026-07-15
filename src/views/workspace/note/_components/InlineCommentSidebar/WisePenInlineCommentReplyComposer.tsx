import { Button } from '@heroui/react';
import { useState } from 'react';

import type { WisePenInlineCommentSidebarProps, WisePenInlineCommentThread } from './index.type';
import styles from './style.module.less';

export function WisePenInlineCommentReplyComposer({
  thread,
  onCancel,
  onSubmitted,
  onReplyThread,
}: {
  thread: WisePenInlineCommentThread;
  onCancel: () => void;
  onSubmitted: () => void;
  onReplyThread?: WisePenInlineCommentSidebarProps['onReplyThread'];
}) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const trimmed = content.trim();

  const handleSubmit = async () => {
    if (!trimmed || submitting || !onReplyThread) {
      return;
    }
    try {
      setSubmitting(true);
      await onReplyThread(thread.id, trimmed);
      setContent('');
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.replyComposer}>
      <textarea
        className={styles.replyInput}
        value={content}
        placeholder="回复批注"
        rows={2}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      />
      <div className={styles.replyActions}>
        <Button size="sm" variant="secondary" isDisabled={submitting} onPress={onCancel}>
          取消
        </Button>
        <Button
          size="sm"
          variant="primary"
          isDisabled={!trimmed || !onReplyThread}
          isPending={submitting}
          onPress={() => void handleSubmit()}
        >
          回复
        </Button>
      </div>
    </div>
  );
}

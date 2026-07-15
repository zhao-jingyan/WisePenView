import data from '@emoji-mart/data';
import { useMemoizedFn } from 'ahooks';
import { Picker } from 'emoji-mart';
import { SmilePlus } from 'lucide-react';
import { useState } from 'react';

import { Popover } from '@/components/Overlay';
import styles from './style.module.less';

type EmojiMartSelectEmoji = {
  native?: string;
};

/** 与后端 emojiId、侧栏展示统一使用 native 字符，避免混用 shortcode/id */
function resolveSelectedEmojiId(emoji: EmojiMartSelectEmoji): string {
  return typeof emoji.native === 'string' ? emoji.native.trim() : '';
}

function EmojiMartPicker({ onSelect }: { onSelect: (emojiId: string) => void }) {
  const handleHostRef = useMemoizedFn((host: HTMLDivElement | null) => {
    if (!host || host.childElementCount > 0) {
      return;
    }
    const picker = new Picker({
      data,
      locale: 'zh',
      set: 'native',
      theme: 'light',
      perLine: 8,
      emojiButtonSize: 34,
      emojiSize: 22,
      previewPosition: 'none',
      navPosition: 'top',
      searchPosition: 'sticky',
      onEmojiSelect: (emoji: EmojiMartSelectEmoji) => {
        const emojiId = resolveSelectedEmojiId(emoji);
        if (emojiId) {
          onSelect(emojiId);
        }
      },
    });
    host.append(picker as unknown as Node);
  });

  return <div ref={handleHostRef} className={styles.emojiMartPickerHost} />;
}

export function InlineCommentEmojiPicker({
  active = false,
  disabled = false,
  onSelect,
}: {
  active?: boolean;
  disabled?: boolean;
  onSelect: (emojiId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emojiId: string) => {
    onSelect(emojiId);
    setOpen(false);
  };

  return (
    <Popover
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (disabled) {
          setOpen(false);
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <Popover.Trigger>
        <button
          type="button"
          className={`${styles.threadQuickActionButton}${active ? ` ${styles.threadQuickActionButtonActive}` : ''}`}
          title="添加表情回复"
          aria-label="添加表情回复"
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <SmilePlus size={14} />
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.emojiPickerPopover} placement="top end">
        <Popover.Dialog>
          <div
            className={styles.emojiPickerPanel}
            data-ignore-thread-select
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {open ? <EmojiMartPicker onSelect={handleSelect} /> : null}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

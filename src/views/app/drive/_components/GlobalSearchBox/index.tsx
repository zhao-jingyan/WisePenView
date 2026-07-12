import { Button, Kbd } from '@heroui/react';
import { useKeyPress } from 'ahooks';
import { Search } from 'lucide-react';
import { useState } from 'react';
import SearchModal from './SearchModal';
import type { GlobalSearchBoxProps } from './index.type';
import styles from './style.module.less';

const IS_MAC = navigator.platform.toLowerCase().includes('mac');
const SHORTCUT_LABEL = IS_MAC ? '⌘+K' : 'Ctrl+K';

/** 工具栏图标按钮触发器 + 受控 Modal；监听 ctrl/⌘+K 打开 */
function GlobalSearchBox({ className, scope }: GlobalSearchBoxProps) {
  const [open, setOpen] = useState(false);

  useKeyPress(
    ['ctrl.k', 'meta.k'],
    (e) => {
      e.preventDefault();
      setOpen(true);
    },
    { exactMatch: true }
  );

  return (
    <>
      <Button
        variant="secondary"
        className={`${styles.searchButton} ${className ?? ''}`}
        onPress={() => setOpen(true)}
      >
        <Search size={16} aria-hidden="true" />
        搜索
        <Kbd>{SHORTCUT_LABEL}</Kbd>
      </Button>
      <SearchModal isOpen={open} scope={scope} onOpenChange={setOpen} />
    </>
  );
}

export default GlobalSearchBox;

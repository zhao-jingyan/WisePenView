import AppIconButton from '@/components/Button/AppIconButton';
import { useKeyPress } from 'ahooks';
import { Search } from 'lucide-react';
import { useState } from 'react';
import SearchModal from './SearchModal';
import type { GlobalSearchProps } from './index.type';

const IS_MAC = navigator.platform.toLowerCase().includes('mac');
const SHORTCUT_LABEL = IS_MAC ? '⌘+K' : 'Ctrl+K';

/** 侧边栏图标按钮触发器 + 受控 Modal；监听 ctrl/⌘+K 打开 */
function GlobalSearch({ scope }: GlobalSearchProps) {
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
      <AppIconButton
        icon={<Search size={18} aria-hidden="true" />}
        label="全局搜索"
        tooltip={{ content: `全局搜索（${SHORTCUT_LABEL}）`, placement: 'bottom' }}
        onPress={() => setOpen(true)}
      />
      <SearchModal isOpen={open} scope={scope} onOpenChange={setOpen} />
    </>
  );
}

export default GlobalSearch;

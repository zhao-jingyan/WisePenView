import { SEARCH_SCOPE, type SearchScope } from '@/domains/Resource';
import { useDebounce, useKeyPress } from 'ahooks';
import { Input, Modal, Segmented } from 'antd';
import { Search } from 'lucide-react';
import { useState } from 'react';
import SearchResultList from '../SearchResultList';
import type { SearchModalProps } from './index.type';
import styles from './style.module.less';

/** antd Modal 处理遮罩/焦点陷阱；destroyOnHidden 让下次开启从空状态重来；keyword 400ms 防抖 */
function SearchModal({ open, onCancel }: SearchModalProps) {
  const [rawKeyword, setRawKeyword] = useState('');
  const debouncedKeyword = useDebounce(rawKeyword, { wait: 400 });
  const [scope, setScope] = useState<SearchScope>(SEARCH_SCOPE.ALL);

  // Safari 下 Esc 关弹窗会顺带触发浏览器退出全屏；须在 keydown capture 阶段先拦截（退出全屏发生在 keydown，keyup 拦截已晚）
  useKeyPress(
    'esc',
    (e) => {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    },
    { events: ['keydown'], useCapture: true }
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      closable={false}
      footer={null}
      width={720}
      destroyOnHidden
      maskClosable
      keyboard={false}
      className={styles.modal}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.header}>
        <Search className={styles.headerIcon} size={18} />
        <Input
          className={styles.input}
          variant="borderless"
          autoFocus
          placeholder="搜索文档、笔记和标签..."
          value={rawKeyword}
          onChange={(e) => setRawKeyword(e.target.value)}
          allowClear
        />
        <kbd className={styles.kbd} onClick={onCancel}>
          Esc
        </kbd>
      </div>

      <div className={styles.tabs}>
        <Segmented<SearchScope>
          options={SEARCH_SCOPE.options.map((option) => ({ ...option, title: '' }))}
          value={scope}
          onChange={setScope}
          block
        />
      </div>

      <SearchResultList keyword={debouncedKeyword} scope={scope} onClose={onCancel} />
    </Modal>
  );
}

export default SearchModal;

import { Button, ListBox, ListBoxItem, Popover } from '@heroui/react';
import { Cloud, Plus, Upload } from 'lucide-react';
import type { Key } from 'react';
import type { UploadMenuProps } from './index.type';
import styles from '../style.module.less';

function UploadMenu({
  open,
  onOpenChange,
  onLocalPress,
  onCloudPress,
}: UploadMenuProps) {
  const handleAction = (key: Key) => {
    if (key === 'local-file') {
      onLocalPress();
      return;
    }
    if (key === 'cloud-file') {
      onCloudPress();
    }
  };

  return (
    <Popover isOpen={open} onOpenChange={onOpenChange}>
      <Popover.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className={styles.toolbarCircleBtn}
          aria-label="上传附件"
          title="上传附件"
        >
          <Plus size={18} />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <div className={styles.popoverPanel}>
            <ListBox
              aria-label="附件操作"
              selectionMode="none"
              className={styles.listBox}
              onAction={handleAction}
            >
              <ListBoxItem id="local-file" textValue="从本地选取">
                <span className={styles.listItemContent}>
                  <Upload size={16} />
                  <span>从本地选取</span>
                </span>
              </ListBoxItem>
              <ListBoxItem id="cloud-file" textValue="从云盘选取">
                <span className={styles.listItemContent}>
                  <Cloud size={16} />
                  <span>从云盘选取</span>
                </span>
              </ListBoxItem>
            </ListBox>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default UploadMenu;

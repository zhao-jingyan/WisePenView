import React from 'react';
import { Menu } from 'antd';
import { RiCloseLine } from 'react-icons/ri';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import type { RecentFilesGroupProps } from './index.type';
import styles from './style.module.less';

const RecentFilesGroup: React.FC<RecentFilesGroupProps> = ({ items, onOpenFile, onCloseFile }) => {
  return (
    <Menu.ItemGroup key="opened-file" title="打开的文件">
      {items.length === 0 ? (
        <Menu.Item key="empty-file" disabled>
          暂无打开的文件
        </Menu.Item>
      ) : (
        items.map((item) => (
          <Menu.Item
            key={`opened-file-${item.resourceId}`}
            icon={<FileTypeIcon resourceType={item.resourceType} size={16} />}
            onClick={() => onOpenFile(item.resourceId)}
          >
            <div className={styles.fileMenuLabel}>
              <span className={styles.fileMenuLabelText}>{item.resourceName || '未命名'}</span>
              <button
                type="button"
                className={styles.fileCloseBtn}
                aria-label={`关闭 ${item.resourceName || '未命名'}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCloseFile(item.resourceId);
                }}
              >
                <RiCloseLine size={14} />
              </button>
            </div>
          </Menu.Item>
        ))
      )}
    </Menu.ItemGroup>
  );
};

export default RecentFilesGroup;

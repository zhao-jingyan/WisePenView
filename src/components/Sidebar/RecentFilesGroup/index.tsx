import React from 'react';
import type { MenuProps } from 'antd';
import { RiCloseLine } from 'react-icons/ri';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import type { RecentFilesGroupProps } from './index.type';
import styles from './style.module.less';

type MenuItem = Required<MenuProps>['items'][number];

export const buildRecentFilesGroupItems = ({
  items,
  onOpenFile,
  onCloseFile,
}: RecentFilesGroupProps): MenuItem[] => {
  const children: MenuItem[] =
    items.length === 0
      ? [
          {
            key: 'empty-file',
            label: '暂无打开的文件',
            disabled: true,
          },
        ]
      : items.map((item) => ({
          key: `opened-file-${item.resourceId}`,
          icon: <FileTypeIcon resourceType={item.resourceType} size={16} />,
          onClick: () => onOpenFile(item.resourceId),
          label: (
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
          ),
        }));

  return [
    {
      key: 'opened-file',
      type: 'group',
      label: '打开的文件',
      children,
    },
  ];
};

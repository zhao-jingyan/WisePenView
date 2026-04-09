import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Input, Modal } from 'antd';
import { useRequest } from 'ahooks';
import { RiCheckLine, RiCloseLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { SessionMenuItemProps } from './index.type';
import styles from './style.module.less';

const SessionMenuItem: React.FC<SessionMenuItemProps> = ({ session, onUpdated, onDeleted }) => {
  const chatService = useChatService();
  const messageApi = useAppMessage();
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(session.title || '');

  const { runAsync: runRenameSession } = useRequest(
    async (newTitle: string) =>
      chatService.renameSession({
        sessionId: session.id,
        newTitle,
      }),
    {
      manual: true,
      onSuccess: async () => {
        messageApi.success('重命名成功');
        setEditing(false);
        await onUpdated();
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '重命名会话失败'));
      },
    }
  );

  const { runAsync: runDeleteSession, loading: deleting } = useRequest(
    async () =>
      chatService.deleteSession({
        sessionId: session.id,
      }),
    {
      manual: true,
      onSuccess: async () => {
        messageApi.success('删除成功');
        onDeleted(session.id);
        await onUpdated();
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '删除会话失败'));
      },
    }
  );

  const submitRename = useCallback(async () => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      messageApi.warning('请输入会话名称');
      return;
    }
    await runRenameSession(trimmedTitle);
  }, [editingTitle, messageApi, runRenameSession]);

  return (
    <div className={clsx(styles.sessionMenuLabel, editing && styles.sessionMenuLabelEditing)}>
      {editing ? (
        <Input
          size="small"
          value={editingTitle}
          className={styles.sessionInlineInput}
          placeholder="请输入会话名称"
          autoFocus
          onChange={(event) => setEditingTitle(event.target.value)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPressEnter={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await submitRename();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setEditing(false);
              setEditingTitle(session.title || '');
            }
          }}
        />
      ) : (
        <span className={styles.sessionMenuLabelText}>{session.title || '未命名会话'}</span>
      )}

      <div className={styles.sessionActions}>
        {editing ? (
          <>
            <button
              type="button"
              className={styles.sessionActionBtn}
              aria-label="确认重命名"
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await submitRename();
              }}
            >
              <RiCheckLine size={16} />
            </button>
            <button
              type="button"
              className={styles.sessionActionBtn}
              aria-label="取消重命名"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setEditing(false);
                setEditingTitle(session.title || '');
              }}
            >
              <RiCloseLine size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.sessionActionBtn}
              aria-label={`重命名 ${session.title || '未命名会话'}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setEditing(true);
                setEditingTitle(session.title || '');
              }}
            >
              <RiEditLine size={16} />
            </button>
            <button
              type="button"
              className={clsx(styles.sessionActionBtn, styles.sessionDeleteBtn)}
              aria-label={`删除 ${session.title || '未命名会话'}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                Modal.confirm({
                  title: '删除会话',
                  content: '删除后不可恢复，是否继续？',
                  okText: '删除',
                  okButtonProps: {
                    danger: true,
                    loading: deleting,
                  },
                  cancelText: '取消',
                  onOk: async () => {
                    await runDeleteSession();
                  },
                });
              }}
            >
              <RiDeleteBinLine size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionMenuItem;

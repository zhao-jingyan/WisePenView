import React, { useCallback, useRef } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { useRequest } from 'ahooks';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useNoteService } from '@/contexts/ServicesContext';
import { useNoteSession } from '@/session/plugins/note/useNoteSession';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
}

const NoteViewConnected: React.FC<NoteViewConnectedProps> = ({ noteId, resourceId }) => {
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const noteService = useNoteService();
  const { status, doc, provider, reconnect } = useNoteSession(resourceId);
  const { data: noteInfoDisplay } = useRequest(
    () => noteService.getNoteInfoDisplay({ resourceId }),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  const isConnected = status === 'connected';
  const isDisconnected = status === 'disconnected';
  const isEditorReadOnly = status === 'connecting';
  const showFullPageSpin = status === 'connecting';

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  return (
    <div className={styles.pageWrap}>
      <div className={styles.noteContent}>
        <div className={styles.root}>
          <header className={styles.pageHeader}>
            <Link to="/app/drive" className={styles.backLink}>
              <RiArrowLeftLine size={18} aria-hidden />
              <span>返回云盘</span>
            </Link>
          </header>
          {isDisconnected ? (
            <Alert
              className={styles.wsAlert}
              type="warning"
              description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
              action={
                <Button type="default" size="small" onClick={reconnect}>
                  重试
                </Button>
              }
            />
          ) : null}
          <NoteTitle
            key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}`}
            id={noteId}
            initialContent={noteInfoDisplay?.noteTitle}
            focusOnMount={isConnected}
            onEnterKey={focusBody}
          />
          <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
          <div className={styles.body}>
            <CustomBlockNote
              key={resourceId}
              ref={bodyEditorRef}
              resourceId={resourceId}
              doc={doc}
              provider={provider}
              readOnly={isEditorReadOnly}
            />
          </div>
        </div>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在连接笔记服务...</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';

  if (!resourceId) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <Result
              status="warning"
              title="无法打开笔记"
              extra={
                <Link to="/app/drive">
                  <Button type="default">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return <NoteViewConnected noteId={noteId} resourceId={resourceId} />;
};

export default NoteView;

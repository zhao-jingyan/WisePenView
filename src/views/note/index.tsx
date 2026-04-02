import React, { useCallback, useRef, useState } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import clsx from 'clsx';

import NoteEditor from '@/components/Note/NoteEditor';
import type { NoteEditorHandle } from '@/components/Note/NoteEditor/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useParamsEffect } from '@/hooks/useParamsEffect';
import styles from './style.module.less';

/**
 * 笔记路由页：在 SystemLayout 中间栏内全幅 Spin，直至用户信息 + Yjs 会话就绪；失败分两类，可重试。
 */
const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const [editorSessionReady, setEditorSessionReady] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const bodyEditorRef = useRef<NoteEditorHandle>(null);

  const resetSessionState = useCallback(() => {
    setEditorSessionReady(false);
    setSessionErrorMessage(null);
    setSessionStatus('connected');
  }, []);

  useParamsEffect([resourceId], (nextResourceId) => {
    resetSessionState();
    if (!nextResourceId) return;
  });

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  const retrySession = useCallback(() => {
    setSessionErrorMessage(null);
    setEditorSessionReady(false);
    setSessionStatus('connected');
    bodyEditorRef.current?.retrySession();
  }, []);

  const handleSessionReady = useCallback(() => {
    setEditorSessionReady(true);
    setSessionErrorMessage(null);
  }, []);

  const handleSessionError = useCallback((message: string) => {
    setSessionErrorMessage(message);
    setEditorSessionReady(false);
  }, []);

  const mountEditorSubtree = Boolean(resourceId) && sessionErrorMessage === null;

  const showFullPageSpin = Boolean(resourceId) && mountEditorSubtree && !editorSessionReady;

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

  return (
    <div className={styles.pageWrap}>
      {mountEditorSubtree ? (
        <div
          className={clsx(styles.noteContent, editorSessionReady && styles.noteContentVisible)}
          aria-hidden={!editorSessionReady}
        >
          <div className={styles.root}>
            <header className={styles.pageHeader}>
              <Link to="/app/drive" className={styles.backLink}>
                <RiArrowLeftLine size={18} aria-hidden />
                <span>返回云盘</span>
              </Link>
            </header>
            {sessionStatus === 'disconnected' ? (
              <Alert
                className={styles.wsAlert}
                type="warning"
                showIcon
                description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
              />
            ) : null}
            <NoteTitle
              key={resourceId}
              id={noteId}
              focusOnMount={editorSessionReady}
              onEnterKey={focusBody}
            />
            <NoteInfoBar resourceId={resourceId} />
            <div className={styles.body}>
              {/* noteId 变化时强制重挂载，避免沿用上一篇笔记的 hook 状态与协同实例 */}
              <NoteEditor
                key={resourceId}
                ref={bodyEditorRef}
                resourceId={resourceId}
                onSessionReady={handleSessionReady}
                onSessionError={handleSessionError}
                onSessionStatusChange={(isConnected) => {
                  setSessionStatus(isConnected ? 'connected' : 'disconnected');
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {sessionErrorMessage ? (
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <Result
              status="error"
              title="笔记连接失败"
              subTitle={sessionErrorMessage}
              extra={
                <Button type="default" onClick={retrySession}>
                  重试
                </Button>
              }
            />
          </div>
        </div>
      ) : null}

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
        </div>
      ) : null}
    </div>
  );
};

export default NoteView;

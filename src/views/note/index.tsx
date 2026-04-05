import React, { useCallback, useRef, useState } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { useUnmount, useUpdateEffect } from 'ahooks';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useNoteConnection } from '@/session/plugins/note/NoteSessionUnit';
import styles from './style.module.less';

/**
 * 笔记路由页：在 SystemLayout 中间栏内全幅 Spin，直至用户信息 + Yjs 会话就绪；失败分两类，可重试。
 */
interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
}

const RECONNECT_BANNER_MIN_VISIBLE_MS = 1_500;

const NoteViewConnected: React.FC<NoteViewConnectedProps> = ({ noteId, resourceId }) => {
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const reconnectBannerShownAtRef = useRef<number | null>(null);
  const reconnectBannerHideTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const { manager, instance } = useNoteConnection(resourceId);
  const sessionStatus = manager.status;
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);

  const isConnected = sessionStatus === 'connected';
  const isReconnecting = sessionStatus === 'reconnecting';
  const isSessionError = sessionStatus === 'error';
  const isEditorAvailable = isConnected || isReconnecting;
  const showFullPageSpin = sessionStatus === 'connecting';

  const clearReconnectBannerHideTimer = useCallback(() => {
    if (reconnectBannerHideTimerRef.current !== null) {
      window.clearTimeout(reconnectBannerHideTimerRef.current);
      reconnectBannerHideTimerRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    if (isReconnecting) {
      clearReconnectBannerHideTimer();
      reconnectBannerShownAtRef.current = Date.now();
      setShowReconnectBanner(true);
      return;
    }

    if (!showReconnectBanner) return;
    const shownAt = reconnectBannerShownAtRef.current;
    if (shownAt === null) {
      setShowReconnectBanner(false);
      return;
    }

    const elapsed = Date.now() - shownAt;
    const remain = Math.max(0, RECONNECT_BANNER_MIN_VISIBLE_MS - elapsed);
    if (remain === 0) {
      reconnectBannerShownAtRef.current = null;
      setShowReconnectBanner(false);
      return;
    }

    clearReconnectBannerHideTimer();
    reconnectBannerHideTimerRef.current = window.setTimeout(() => {
      reconnectBannerHideTimerRef.current = null;
      reconnectBannerShownAtRef.current = null;
      setShowReconnectBanner(false);
    }, remain);
  }, [clearReconnectBannerHideTimer, isReconnecting, showReconnectBanner]);

  useUnmount(() => {
    clearReconnectBannerHideTimer();
  });

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  const retrySession = useCallback(() => {
    void manager.retry();
  }, [manager]);

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
          {showReconnectBanner ? (
            <Alert
              className={styles.wsAlert}
              type="warning"
              showIcon
              description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
            />
          ) : null}
          {isSessionError ? (
            <Alert
              className={styles.wsAlert}
              type="error"
              showIcon
              description="连接笔记服务失败，请检查网络后重试。"
              action={
                <Button type="default" size="small" onClick={retrySession}>
                  重试
                </Button>
              }
            />
          ) : null}
          <NoteTitle
            key={resourceId}
            id={noteId}
            focusOnMount={isConnected}
            onEnterKey={focusBody}
          />
          <NoteInfoBar resourceId={resourceId} />
          <div className={styles.body}>
            {isEditorAvailable ? (
              <CustomBlockNote
                key={resourceId}
                ref={bodyEditorRef}
                resourceId={resourceId}
                instance={instance}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
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

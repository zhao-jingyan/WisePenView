import React, { useCallback, useRef, useState } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { useRequest, useUnmount } from 'ahooks';
import { Link, useParams } from 'react-router-dom';
import { RiArrowLeftDoubleLine, RiArrowLeftLine, RiMenuLine } from 'react-icons/ri';

import FileTypeIcon from '@/components/Common/FileTypeIcon';
import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import rvhStyles from '@/components/Common/ResourceViewerHeader/style.module.less';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteOutline from '@/components/Note/NoteOutline';
import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteTitle from '@/components/Note/NoteTitle';
import { useNoteService } from '@/contexts/ServicesContext';
import type { NoteInfoDisplayData } from '@/services/Note';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useNoteSession } from '@/session/note/useNoteSession';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { RESOURCE_TYPE } from '@/constants/resource';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
}

const NoteViewConnected: React.FC<NoteViewConnectedProps> = ({
  noteId,
  resourceId,
  noteInfoDisplay,
}) => {
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const { status, doc, provider, reconnect } = useNoteSession(resourceId);

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting';
  const showFullPageSpin = status === 'connecting';

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = useCallback(() => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  }, [reconnect]);

  const noteTitleText = noteInfoDisplay?.noteTitle?.trim() || '未命名笔记';
  const outlineItemsWithTitle: NoteOutlineItem[] = [
    { id: '__note_title__', level: 0, text: noteTitleText },
    ...outlineItems,
  ];

  const toolbarNoteTitle =
    noteInfoDisplay.noteTitle?.trim() && noteInfoDisplay.noteTitle.trim() !== '未命名笔记'
      ? noteInfoDisplay.noteTitle.trim()
      : '未命名笔记';

  return (
    <div className={styles.pageWrap}>
      <ResourceViewerHeader
        inlineTitle={
          <>
            <span aria-hidden className={styles.headerTypeIcon}>
              <FileTypeIcon resourceType={RESOURCE_TYPE.NOTE} />
            </span>
            <span className={rvhStyles.inlineTitleText}>{toolbarNoteTitle}</span>
          </>
        }
      />
      <div className={styles.statesBelowHeader}>
        <div className={styles.mainScroll} ref={mainScrollRef}>
          <div className={styles.contentRow}>
            {isOutlineOpen ? (
              <aside className={styles.outlineAside} aria-label="文档目录侧栏">
                <div className={styles.outlineTopRow}>
                  <span className={styles.outlineTopTitle}>目录</span>
                  <button
                    type="button"
                    className={styles.outlineToggleBtn}
                    aria-label="收起目录"
                    onClick={() => setIsOutlineOpen(false)}
                  >
                    <RiArrowLeftDoubleLine size={20} />
                  </button>
                </div>
                <div className={styles.outlineScrollArea}>
                  <NoteOutline
                    items={outlineItemsWithTitle}
                    activeId={activeHeadingId}
                    onNavigate={(id) => {
                      if (id === '__note_title__') {
                        const anchor = titleAnchorRef.current;
                        if (anchor) {
                          anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
                          window.requestAnimationFrame(() => {
                            const editable = anchor.querySelector(
                              '[contenteditable="true"]'
                            ) as HTMLElement | null;
                            editable?.focus();
                          });
                        } else {
                          mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        return;
                      }
                      bodyEditorRef.current?.navigateToBlock(id);
                    }}
                  />
                </div>
              </aside>
            ) : (
              <div className={styles.outlineCollapsedCol} aria-label="展开目录">
                <button
                  type="button"
                  className={styles.outlineToggleBtn}
                  aria-label="展开目录"
                  onClick={() => setIsOutlineOpen(true)}
                >
                  <RiMenuLine size={20} />
                </button>
              </div>
            )}

            <div className={styles.mainCol}>
              <div className={styles.root}>
                {isDisconnected ? (
                  <Alert
                    className={styles.wsAlert}
                    type="warning"
                    description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
                    action={
                      <Button
                        type="default"
                        size="small"
                        loading={isReconnectLoading}
                        onClick={handleReconnect}
                      >
                        重试
                      </Button>
                    }
                  />
                ) : null}
                <div ref={titleAnchorRef}>
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}`}
                    id={noteId}
                    initialContent={noteInfoDisplay?.noteTitle}
                    focusOnMount={isConnected}
                    onEnterKey={focusBody}
                  />
                </div>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  <CustomBlockNote
                    key={resourceId}
                    ref={bodyEditorRef}
                    resourceId={resourceId}
                    doc={doc}
                    provider={provider}
                    readOnly={isEditorReadOnly}
                    onOutlineChange={setOutlineItems}
                    onActiveHeadingChange={setActiveHeadingId}
                  />
                </div>
              </div>
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
    </div>
  );
};

const NoteView: React.FC = () => {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
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
      </div>
    );
  }

  if (noteInfoError) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle={parseErrorMessage(noteInfoError, '笔记不存在或无访问权限')}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNoteInfoLoading) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!noteInfoDisplay) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle="笔记信息为空，请稍后重试"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NoteViewConnected noteId={noteId} resourceId={resourceId} noteInfoDisplay={noteInfoDisplay} />
  );
};

export default NoteView;

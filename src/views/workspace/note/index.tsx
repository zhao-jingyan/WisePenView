import { ResultState, Spin } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useRequest, useUnmount } from 'ahooks';
import { ChevronsRight, Menu } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import EntryIcon from '@/components/Icons/EntryIcon';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type {
  NoteBodyEditorHandle,
  NoteCollaborationUser,
} from '@/components/Note/CustomBlockNote/index.type';
import NoteOutline from '@/components/Note/NoteOutline';
import {
  NOTE_OUTLINE_TITLE_ID,
  type NoteOutlineItem,
} from '@/components/Note/NoteOutline/index.type';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/_shadcn';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type { AiDiffDisplayMode, NoteInfoDisplayData } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, AI_DIFF_DISPLAY_MODE_LABELS, useNoteSession } from '@/domains/Note';
import { RESOURCE_TYPE } from '@/domains/Resource';
import type { User } from '@/domains/User';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useWorkspaceLayoutConfig } from '@/layouts/Workspace/WorkspaceOutletContext';
import { useAiDiffDisplayStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Alert, Button, Dropdown, toast, Tooltip } from '@heroui/react';
import ResourcePermissionControl from '../_components/ResourcePermissionControl';
import NoteInfoBar from './_components/NoteInfoBar';
import NoteTitle from './_components/NoteTitle';
import type { NoteTitleHandle } from './_components/NoteTitle/index.type';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => void;
}

interface NoteToolbarTitleProps {
  resourceId: string;
  fallbackTitle?: string;
}

const AI_DIFF_DISPLAY_OPTIONS: Array<{ value: AiDiffDisplayMode; label: string }> = [
  {
    value: AI_DIFF_DISPLAY_MODE.OLD_ONLY,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.OLD_ONLY],
  },
  {
    value: AI_DIFF_DISPLAY_MODE.NEW_ONLY,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.NEW_ONLY],
  },
  {
    value: AI_DIFF_DISPLAY_MODE.COMPARE,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.COMPARE],
  },
];

const NOTE_COLLABORATION_COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
  '#059669',
  '#ea580c',
] as const;

function getNoteCollaborationUserName(user?: User): string {
  return user?.nickname?.trim() || user?.realName?.trim() || user?.username?.trim() || '当前用户';
}

function pickNoteCollaborationColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return NOTE_COLLABORATION_COLORS[hash % NOTE_COLLABORATION_COLORS.length];
}

function buildNoteCollaborationUser(user?: User): NoteCollaborationUser {
  const name = getNoteCollaborationUserName(user);
  const colorSeed = user?.id?.trim() || user?.username?.trim() || name;
  return {
    name,
    color: pickNoteCollaborationColor(colorSeed),
  };
}

function NoteLayoutConfig({ children }: { children: ReactNode }) {
  const frameConfig = useMemo(() => ({ className: styles.pageWrap }), []);
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function NoteToolbarTitle({ resourceId, fallbackTitle }: NoteToolbarTitleProps) {
  const title = useResourceDisplayName(resourceId, fallbackTitle, '未命名笔记');

  return (
    <span className={styles.toolbarTitleText}>
      <span className={styles.toolbarTitleIcon} aria-hidden="true">
        <EntryIcon entryType="resource" resourceType={RESOURCE_TYPE.NOTE} />
      </span>
      <span className={styles.toolbarTitleLabel}>{title}</span>
    </span>
  );
}

function NoteViewConnected({
  resourceId,
  noteInfoDisplay,
  onRefreshNoteInfo,
}: NoteViewConnectedProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [isDownloadingMarkdown, setIsDownloadingMarkdown] = useState(false);
  const [aiDiffPresence, setAiDiffPresence] = useState<{
    resourceId: string;
    hasAiDiffContent: boolean;
  }>({
    resourceId,
    hasAiDiffContent: false,
  });
  const { status, doc, provider, reconnect } = useNoteSession(resourceId);
  const resourceService = useResourceService();
  const userService = useUserService();
  const { data: currentUser, error: currentUserError } = useRequest(
    () => userService.getUserInfo(),
    {
      ready: Boolean(resourceId),
    }
  );

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const showFullPageSpin = status === 'connecting' || shouldWaitCurrentUser;
  const middleOverlayText = status === 'connecting' ? '正在连接笔记服务...' : '正在加载用户信息...';
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;
  const collaborationUser = useMemo(() => buildNoteCollaborationUser(currentUser), [currentUser]);
  const canRenderBodyEditor = !shouldWaitCurrentUser;

  // 进入页面时上报阅读
  useRequest(() => resourceService.interactRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = () => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  };

  const showAiDiffDisplayModeSwitch =
    aiDiffPresence.resourceId === resourceId && aiDiffPresence.hasAiDiffContent;

  const handleAiDiffPresenceChange = useCallback(
    (hasAiDiffContent: boolean) => {
      setAiDiffPresence({ resourceId, hasAiDiffContent });
    },
    [resourceId]
  );

  const handlePrintPdf = useCallback(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
    const titleRoot = titleApi?.getProseMirrorRoot() ?? null;
    try {
      setPdfExportLoading(true);
      await bodyApi.exportPdf({ title, titleRoot });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setPdfExportLoading(false);
    }
  }, [fallbackNoteTitle]);

  const handleDownloadMarkdown = useCallback(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    try {
      setIsDownloadingMarkdown(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
      await bodyApi.downloadMarkdown(title);
      toast.success('Markdown 下载已开始');
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setIsDownloadingMarkdown(false);
    }
  }, [fallbackNoteTitle]);

  const headerMorePending = pdfExportLoading || isDownloadingMarkdown;

  const handleMoreAction = useCallback(
    (key: React.Key) => {
      if (key === 'print-pdf') {
        void handlePrintPdf();
        return;
      }
      if (key === 'download-md') {
        void handleDownloadMarkdown();
      }
    },
    [handleDownloadMarkdown, handlePrintPdf]
  );

  const workspaceFrameConfig = useMemo(
    () => ({
      className: styles.pageWrap,
      header: {
        inlineTitle: (
          <NoteToolbarTitle resourceId={resourceId} fallbackTitle={noteInfoDisplay?.noteTitle} />
        ),
        extra: (
          <div className={styles.headerToolbarExtra}>
            {showAiDiffDisplayModeSwitch ? (
              <SegmentedTabs<AiDiffDisplayMode>
                ariaLabel="AI 差异展示模式"
                selectedKey={aiDiffDisplayMode}
                className={styles.aiDiffDisplayModeSwitch}
                items={AI_DIFF_DISPLAY_OPTIONS.map((option) => ({
                  key: option.value,
                  label: option.label,
                  disabled: showFullPageSpin,
                }))}
                onSelectionChange={setAiDiffDisplayMode}
              />
            ) : null}
            <ResourcePermissionControl
              resourceId={resourceId}
              resourceType={WORKSPACE_RESOURCE_TYPE.NOTE}
              ownerId={noteInfoDisplay.ownerId}
              isDisabled={showFullPageSpin}
              onSuccess={onRefreshNoteInfo}
            />
            <div className={styles.headerMoreWrap}>
              <Dropdown>
                <Dropdown.Trigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    isPending={headerMorePending}
                    isDisabled={showFullPageSpin}
                    aria-label="更多"
                  >
                    更多
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu aria-label="笔记更多操作" onAction={handleMoreAction}>
                    <Dropdown.Item id="print-pdf" textValue="打印为pdf">
                      打印为pdf
                    </Dropdown.Item>
                    <Dropdown.Item id="download-md" textValue="下载为md">
                      下载为md
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>
        ),
      },
    }),
    [
      aiDiffDisplayMode,
      handleMoreAction,
      headerMorePending,
      noteInfoDisplay?.noteTitle,
      noteInfoDisplay.ownerId,
      onRefreshNoteInfo,
      resourceId,
      setAiDiffDisplayMode,
      showAiDiffDisplayModeSwitch,
      showFullPageSpin,
    ]
  );
  useWorkspaceLayoutConfig(workspaceFrameConfig);

  return (
    <>
      <div className={styles.mainScroll}>
        <ResizablePanelGroup orientation="horizontal" className={styles.contentRow}>
          <ResizablePanel id="note-main" minSize="45%" className={styles.mainPanel}>
            <div className={styles.mainCol} ref={mainScrollRef}>
              <div className={styles.root}>
                {isDisconnected ? (
                  <Alert className={styles.wsAlert} status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。
                      </Alert.Description>
                    </Alert.Content>
                    <div className={styles.wsAlertAction}>
                      <Button
                        variant="secondary"
                        size="sm"
                        isDisabled={isReconnectLoading}
                        onPress={handleReconnect}
                      >
                        重试
                      </Button>
                    </div>
                  </Alert>
                ) : null}
                <div ref={titleAnchorRef}>
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={titleEditorRef}
                    id={resourceId}
                    initialContent={noteInfoDisplay?.noteTitle}
                    readOnly={isTitleReadOnly}
                    focusOnMount={isConnected && !isTitleReadOnly}
                    onEnterKey={focusBody}
                  />
                </div>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  {canRenderBodyEditor ? (
                    <CustomBlockNote
                      key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}-${collaborationUser.name}-${collaborationUser.color}`}
                      ref={bodyEditorRef}
                      resourceId={resourceId}
                      doc={doc}
                      provider={provider}
                      collaborationUser={collaborationUser}
                      aiDiffDisplayMode={aiDiffDisplayMode}
                      readOnly={isEditorReadOnly}
                      blockLocalDocWrites={blockLocalDocWrites}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAiDiffPresenceChange={handleAiDiffPresenceChange}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </ResizablePanel>

          {isOutlineOpen ? (
            <>
              <ResizableHandle className={styles.resizeHandle} />
              <ResizablePanel
                id="note-outline"
                defaultSize={260}
                minSize={220}
                maxSize={360}
                className={styles.outlinePanel}
              >
                <aside className={styles.outlineAside} aria-label="文档目录侧栏">
                  <div className={styles.outlineTopRow}>
                    <span className={styles.outlineTopTitle}>目录</span>
                    <button
                      type="button"
                      className={styles.outlineToggleBtn}
                      aria-label="收起目录"
                      onClick={() => setIsOutlineOpen(false)}
                    >
                      <ChevronsRight size={20} />
                    </button>
                  </div>
                  <div className={styles.outlineScrollArea}>
                    <NoteOutline
                      items={outlineItems}
                      activeId={activeHeadingId}
                      titleResourceId={resourceId}
                      titleFallback={noteInfoDisplay?.noteTitle}
                      onNavigate={(id) => {
                        if (id === NOTE_OUTLINE_TITLE_ID) {
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
              </ResizablePanel>
            </>
          ) : (
            <ResizablePanel
              id="note-outline-collapsed"
              defaultSize={40}
              minSize={40}
              maxSize={40}
              disabled
              className={styles.outlineCollapsedPanel}
            >
              <div className={styles.outlineCollapsedCol} aria-label="展开目录">
                <Tooltip>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={styles.outlineToggleBtn}
                      aria-label="展开目录"
                      onClick={() => setIsOutlineOpen(true)}
                    >
                      <Menu size={20} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>展开目录</Tooltip.Content>
                </Tooltip>
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{middleOverlayText}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface NoteViewProps {
  resourceId?: string;
}

function NoteView({ resourceId = '' }: NoteViewProps = {}) {
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
    refresh: refreshNoteInfo,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (noteInfoError) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              subTitle={parseErrorMessage(noteInfoError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (isNoteInfoLoading && !noteInfoDisplay) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (!noteInfoDisplay) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              subTitle="笔记信息为空，请稍后重试"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  return (
    <NoteViewConnected
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refreshNoteInfo}
    />
  );
}

export default NoteView;

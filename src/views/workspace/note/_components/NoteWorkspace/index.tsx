import { Spin } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useMemoizedFn, useRequest, useUnmount } from 'ahooks';
import { useCallback, useMemo, useRef, useState } from 'react';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteOutlineItem } from '@/components/Note/CustomBlockNote/content/outline';
import { useDocumentInlineCommentVisibility } from '@/components/Note/CustomBlockNote/engines/inlineComment';
import type {
  NoteBodyEditorHandle,
  NoteCollaborationUser,
  NoteInlineCommentStatus,
} from '@/components/Note/CustomBlockNote/index.type';
import { useInteractService, useUserService } from '@/domains';
import type {
  AiDiffDisplayMode,
  NoteInfoDisplayData,
  NoteSaveStatus,
  NoteSelectionSnapshot,
} from '@/domains/Note';
import {
  AI_DIFF_DISPLAY_MODE,
  AI_DIFF_DISPLAY_MODE_LABELS,
  encodeNoteClientContentSignature,
  useNoteSession,
} from '@/domains/Note';
import { isInlineCommentVisibilityPrivileged } from '@/domains/Resource';
import type { User } from '@/domains/User';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostChatContextActions,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { useWorkspaceResourceSidePanelStore } from '@/views/workspace/_store/useWorkspaceResourceSidePanelStore';
import { Alert, Button, Switch, toast } from '@heroui/react';
import {
  createNoteChatStateProvider,
  createNoteSelectionChatContext,
} from '../../NoteChatProtocol';
import { useAiDiffDisplayStore } from '../../_store/useAiDiffDisplayStore';
import styles from '../../style.module.less';
import NoteInfoBar from '../NoteInfoBar';
import NoteOutline, { NOTE_OUTLINE_TITLE_ID } from '../NoteOutline';
import NoteTitle, { type NoteTitleHandle, type NoteTitleSaveStatus } from '../NoteTitle';

interface NoteWorkspaceProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
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

function sanitizeDownloadFileName(fileName: string): string {
  const normalizedName = fileName.trim().replace(/[\\/:*?"<>|]+/g, '_');
  const safeName = normalizedName.replace(/[.\s]+$/g, '');
  return safeName || '未命名笔记';
}

function downloadTextArtifact(params: {
  content: string;
  mimeType: string;
  fileName: string;
}): void {
  const blob = new Blob([params.content], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = params.fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}

function buildNoteCollaborationUser(user?: User): NoteCollaborationUser {
  const name = getNoteCollaborationUserName(user);
  const colorSeed = user?.id?.trim() || user?.username?.trim() || name;
  return {
    name,
    color: pickNoteCollaborationColor(colorSeed),
  };
}

type NoteHeaderSaveStatus = NoteSaveStatus | 'failed';

function resolveNoteHeaderSaveStatus(
  bodyStatus: NoteSaveStatus,
  titleStatus: NoteTitleSaveStatus
): NoteHeaderSaveStatus {
  if (titleStatus === 'failed') return 'failed';
  if (bodyStatus === 'waiting') return 'waiting';
  if (bodyStatus === 'saving' || titleStatus === 'saving') return 'saving';
  return 'saved';
}

function formatNoteSaveStatus(status: NoteHeaderSaveStatus): string {
  if (status === 'saving') return '保存中...';
  if (status === 'waiting') return '等待网络同步';
  if (status === 'failed') return '保存失败';
  return '已自动保存';
}

function resolveInlineCommentStatus(
  enabled: boolean,
  connected: boolean,
  canEdit: boolean
): NoteInlineCommentStatus {
  if (!enabled) return { kind: 'disabled' };
  if (!connected) return { kind: 'connecting', hasWritePermission: canEdit };
  return canEdit ? { kind: 'writable' } : { kind: 'readOnly' };
}

function NoteWorkspace({ resourceId, noteInfoDisplay, onRefreshNoteInfo }: NoteWorkspaceProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const { setChatContext } = useResourceHostChatContextActions();
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const scrollBarHideTimerRef = useRef<number | null>(null);
  const [isMainScrolling, setIsMainScrolling] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isInlineCommentHistoryOpen, setIsInlineCommentHistoryOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [aiBulkActionsPortalContainer, setAiBulkActionsPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [inlineCommentSidebarHostElement, setInlineCommentSidebarHostElement] =
    useState<HTMLElement | null>(null);
  const [exportPending, setExportPending] = useState(false);
  const [titleSaveStatus, setTitleSaveStatus] = useState<NoteTitleSaveStatus>('saved');
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const interactService = useInteractService();
  const userService = useUserService();
  const { data: currentUser, error: currentUserError } = useRequest(() =>
    userService.getUserInfo()
  );
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const { status, saveStatus, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId, {
    actorUserId: currentUser?.id,
    enabled: !shouldWaitCurrentUser,
    localOnly: Boolean(noteInfoDisplay.aiDiffPreview),
  });
  const setSidePanelMode = useWorkspaceResourceSidePanelStore((state) => state.setMode);
  const { visibility: inlineCommentVisibility, setCollaboratorVisibility } =
    useDocumentInlineCommentVisibility(status === 'connected' ? doc : null);

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const showFullPageSpin = (status === 'connecting' && !idbSynced) || shouldWaitCurrentUser;
  const middleOverlayText =
    status === 'connecting' && !idbSynced ? '正在连接笔记服务...' : '正在加载用户信息...';
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;
  const [aiDiffBodyContentHash, setAiDiffBodyContentHash] = useState<string | undefined>(undefined);
  const noteClientContentSignature = useMemo(
    () =>
      aiDiffBodyContentHash
        ? encodeNoteClientContentSignature({ bodyHash: aiDiffBodyContentHash })
        : undefined,
    [aiDiffBodyContentHash]
  );
  const isNoteClientContentSignaturePending = !aiDiffBodyContentHash;
  const resourceName = useResourceDisplayName(resourceId, fallbackNoteTitle, '未命名笔记');
  const headerSaveStatus = resolveNoteHeaderSaveStatus(saveStatus, titleSaveStatus);
  const saveStatusText = formatNoteSaveStatus(headerSaveStatus);
  const collaborationUser = useMemo(() => buildNoteCollaborationUser(currentUser), [currentUser]);
  const canRenderBodyEditor = !shouldWaitCurrentUser;
  const canManageInlineCommentVisibility =
    isInlineCommentVisibilityPrivileged(noteInfoDisplay.resourceInfo?.resourceAccessRole) ||
    (Boolean(noteInfoDisplay.ownerId) && currentUser?.id === noteInfoDisplay.ownerId);
  const inlineCommentStatus = resolveInlineCommentStatus(
    noteInfoDisplay.inlineCommentEnabled,
    isConnected,
    noteInfoDisplay.canEditInlineComment
  );
  const openInlineCommentPanel = useCallback(() => {
    setSidePanelMode(resourceId, 'inlineComment');
  }, [resourceId, setSidePanelMode]);

  useRequest(() => interactService.recordResourceRead(resourceId), {
    refreshDeps: [resourceId],
  });

  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  const handleOutlineNavigate = (id: string) => {
    if (id !== NOTE_OUTLINE_TITLE_ID) {
      bodyEditorRef.current?.navigateToBlock(id);
      return;
    }
    const anchor = titleAnchorRef.current;
    if (!anchor) {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
    window.requestAnimationFrame(() => {
      anchor.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
    });
  };

  useUnmount(() => {
    if (scrollBarHideTimerRef.current !== null) {
      window.clearTimeout(scrollBarHideTimerRef.current);
      scrollBarHideTimerRef.current = null;
    }
  });

  const handleMainScroll = useMemoizedFn(() => {
    setIsMainScrolling(true);
    if (scrollBarHideTimerRef.current !== null) {
      window.clearTimeout(scrollBarHideTimerRef.current);
    }
    scrollBarHideTimerRef.current = window.setTimeout(() => {
      setIsMainScrolling(false);
      scrollBarHideTimerRef.current = null;
    }, 700);
  });

  const showAiDiffDisplayModeSwitch = hasAiDiffContent;

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
      setExportPending(true);
      await bodyApi.exportPdf({ title, titleRoot });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  }, [fallbackNoteTitle]);

  const handleDownloadMarkdown = useCallback(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    try {
      setExportPending(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
      const artifact = bodyApi.exportMarkdown();
      downloadTextArtifact({
        content: artifact.content,
        mimeType: artifact.mimeType,
        fileName: `${sanitizeDownloadFileName(title)}.${artifact.extension}`,
      });
      toast.success('Markdown 下载已开始');
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  }, [fallbackNoteTitle]);

  const noteChatStateProvider = useMemo(
    () =>
      createNoteChatStateProvider({
        resourceId,
        syncStatus: status,
        isClientContentSignaturePending: isNoteClientContentSignaturePending,
        clientContentSignature: noteClientContentSignature,
      }),
    [isNoteClientContentSignaturePending, noteClientContentSignature, resourceId, status]
  );

  const handleAskAi = useCallback(
    (selection: NoteSelectionSnapshot) => {
      setChatContext(createNoteSelectionChatContext(resourceId, selection));
    },
    [resourceId, setChatContext]
  );

  const resourceHostConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      chatStateProvider: noteChatStateProvider,
      sidePanel: noteInfoDisplay.resourceInfo
        ? {
            resource: noteInfoDisplay.resourceInfo,
            inlineComment: noteInfoDisplay.inlineCommentEnabled ? (
              <div
                ref={setInlineCommentSidebarHostElement}
                className={styles.inlineCommentSidePanelHost}
              />
            ) : undefined,
            onResourceChanged: onRefreshNoteInfo,
          }
        : undefined,
      header: {
        resource: {
          resourceId,
          resourceName,
          resourceIconType: 'note',
          currentActions: noteInfoDisplay.resourceInfo?.currentActions,
          copyVersion: noteInfoDisplay.version,
          permissionResourceType: RESOURCE_KIND.NOTE,
          ownerId: noteInfoDisplay.ownerId,
          onPermissionSuccess: onRefreshNoteInfo,
          isDisabled: showFullPageSpin,
          titleMeta: (
            <span
              className={`${styles.headerSaveStatus} ${
                headerSaveStatus === 'waiting' ? styles.headerSaveStatusWaiting : ''
              } ${headerSaveStatus === 'failed' ? styles.headerSaveStatusFailed : ''}`}
            >
              {saveStatusText}
            </span>
          ),
          leadingActions: showAiDiffDisplayModeSwitch ? (
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
          ) : null,
          moreMenu: {
            advanced: canManageInlineCommentVisibility ? (
              <div className={styles.inlineCommentVisibilitySetting}>
                <div className={styles.inlineCommentVisibilityCopy}>
                  <span className={styles.inlineCommentVisibilityTitle}>隔离协作者批注</span>
                  <span className={styles.inlineCommentVisibilityDescription}>
                    开启后，协作者只能查看自己的批注。
                  </span>
                </div>
                <Switch
                  aria-label="隔离协作者批注"
                  isSelected={inlineCommentVisibility.collaboratorVisibility === 'own_only'}
                  isDisabled={!isConnected}
                  onChange={(selected) => setCollaboratorVisibility(selected ? 'own_only' : 'all')}
                  size="sm"
                >
                  <Switch.Content aria-label="隔离协作者批注">
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            ) : undefined,
            showInlineCommentHistory: noteInfoDisplay.inlineCommentEnabled,
            onInlineCommentHistory: () => setIsInlineCommentHistoryOpen(true),
            onPrint: () => void handlePrintPdf(),
            download: {
              label: '下载为 Markdown',
              onAction: () => void handleDownloadMarkdown(),
            },
            isPending: exportPending,
          },
        },
      },
    }),
    [
      aiDiffDisplayMode,
      canManageInlineCommentVisibility,
      inlineCommentVisibility.collaboratorVisibility,
      handleDownloadMarkdown,
      handlePrintPdf,
      exportPending,
      isConnected,
      noteChatStateProvider,
      noteInfoDisplay.inlineCommentEnabled,
      noteInfoDisplay.ownerId,
      noteInfoDisplay.resourceInfo,
      noteInfoDisplay.version,
      onRefreshNoteInfo,
      resourceId,
      resourceName,
      headerSaveStatus,
      saveStatusText,
      setAiDiffDisplayMode,
      setCollaboratorVisibility,
      showAiDiffDisplayModeSwitch,
      showFullPageSpin,
    ]
  );
  useResourceHostLayoutConfig(resourceHostConfig);

  return (
    <>
      <div className={styles.mainScroll}>
        <div
          className={`${styles.contentRow} ${
            isOutlineOpen ? styles.contentRowOutlineOpen : styles.contentRowOutlineCollapsed
          }`}
        >
          <div className={styles.mainPanel} ref={setAiBulkActionsPortalContainer}>
            <div
              className={`${styles.mainCol} ${isMainScrolling ? styles.mainColScrolling : ''}`}
              ref={mainScrollRef}
              onScroll={handleMainScroll}
            >
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
                        isDisabled={status !== 'disconnected'}
                        onPress={reconnect}
                      >
                        重试
                      </Button>
                    </div>
                  </Alert>
                ) : null}
                <div ref={titleAnchorRef}>
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay.noteTitle}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={titleEditorRef}
                    id={resourceId}
                    initialContent={noteInfoDisplay.noteTitle}
                    readOnly={isTitleReadOnly}
                    focusOnMount={isConnected && !isTitleReadOnly}
                    onEnterKey={focusBody}
                    onSaveStatusChange={setTitleSaveStatus}
                  />
                </div>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  {canRenderBodyEditor ? (
                    <CustomBlockNote
                      key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}-${noteInfoDisplay.canEditInlineComment}`}
                      ref={bodyEditorRef}
                      resourceId={resourceId}
                      aiDiffPreview={noteInfoDisplay.aiDiffPreview}
                      collaboration={{
                        doc,
                        provider,
                        user: collaborationUser,
                        ready: isConnected,
                      }}
                      state={{
                        aiDiffDisplayMode,
                        readOnly: isEditorReadOnly,
                        blockLocalDocWrites,
                      }}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAiDiffPresenceChange={setHasAiDiffContent}
                      onAskAi={handleAskAi}
                      inlineComment={{
                        status: inlineCommentStatus,
                        actor: currentUser,
                        usersById: noteInfoDisplay.inlineCommentAuthorsById,
                        documentRole: noteInfoDisplay.canCollaborativeEdit ? 'editor' : 'comment',
                        visibilityPrivileged: canManageInlineCommentVisibility,
                        collaboratorVisibility: inlineCommentVisibility.collaboratorVisibility,
                        onOpen: openInlineCommentPanel,
                        history: {
                          open: isInlineCommentHistoryOpen,
                          onOpenChange: setIsInlineCommentHistoryOpen,
                        },
                      }}
                      portalContainers={{
                        inlineCommentSidebar: inlineCommentSidebarHostElement,
                        aiBulkActions: aiBulkActionsPortalContainer,
                      }}
                      onAiDiffBodyContentHashChange={setAiDiffBodyContentHash}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <NoteOutline
            open={isOutlineOpen}
            onOpenChange={setIsOutlineOpen}
            items={outlineItems}
            activeId={activeHeadingId}
            title={resourceName}
            onNavigate={handleOutlineNavigate}
          />
        </div>
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

export default NoteWorkspace;

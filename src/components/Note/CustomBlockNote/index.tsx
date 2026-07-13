import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import { usePendingNoteImportStore } from '@/components/Note/_store/usePendingNoteImportStore';
import { useImageService, useResourceService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import type { AiDiffDisplayMode, NoteSelectionSnapshot, SelectedNoteScope } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, computeNoteBodyContentHash } from '@/domains/Note';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  parseErrorMessage,
  WisePenError,
} from '@/utils/error';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useLatest, useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import NoteSideMenu from '../NoteSideMenu';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteTableHandles from '../NoteTableHandles';
import NoteToolbar from '../NoteToolbar';
import { blockNoteSchema, type CustomBlockNoteEditor } from './blockNoteSchema';
import {
  buildCommentsExtension,
  capturePendingCommentSelection,
  commentStyles,
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
  LatexCommentProvider,
  NoteCommentsUi,
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
  syncDomSelectionToProseMirror,
  useFormulaComments,
  useInlineCommentsSync,
  useSyncCommentDocumentMarks,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './comments';
import { resolveNoteCommentsRuntimePolicy } from './comments/core/commentPolicy';
import { syncCommentUserProfileToYMap } from './comments/core/commentUserProfile';
import { mergeReadOnlyEditorProps, NoteEditorReadOnlyProvider } from './editorReadOnly';
import {
  useAttachNoteYjsUndoStack,
  useNoteCaptureKeyEvent,
  useNoteYjsFragment,
  useNoteYjsUndoManager,
} from './hooks';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { buildOutlineProjection, resolveActiveHeadingId } from './Outline';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createNoteReadOnlyFilterExtension,
  exportNoteMarkdown,
  hasAiDiffContentFromEditor,
  importNoteMarkdown,
  isCommentableSelection,
  notePluginRegistry,
} from './plugins';
import { printNotePdfViaBrowser, waitForEditorPaint } from './plugins/noteBrowserPrint';
import { syncAiDiffBlockFoldDisplayMode } from './plugins/runtime/aiDiff';
import { AiDiffBulkActions } from './plugins/runtime/aiDiff/BulkActions';
import { AiDiffDisplayModeProvider } from './plugins/runtime/aiDiff/displayModeContext';
import { useAiDiffNormalization } from './plugins/runtime/aiDiff/yjs/useAiDiffNormalization';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type CollaborationUser = {
  name: string;
  color: string;
};
type YCursorExtensionHandle = {
  updateUser?: (user: CollaborationUser) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function buildSelectedNoteScope(editor: CustomBlockNoteEditor): SelectedNoteScope | null {
  const selectedBlocks = editor.getSelection()?.blocks;
  if (!selectedBlocks?.length) return null;
  const startBlockId = selectedBlocks[0]?.id;
  const endBlockId = selectedBlocks[selectedBlocks.length - 1]?.id;
  if (!startBlockId || !endBlockId) return null;
  return { type: 'blockRange', startBlockId, endBlockId };
}

function CustomBlockNote({
  resourceId,
  collaboration: { doc, provider, user: collaborationUser, ready: collaborationReady },
  state: { aiDiffDisplayMode, readOnly, blockLocalDocWrites },
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  onAskAi,
  comments: {
    status: commentsStatus,
    actor: commentUser,
    usersById: commentUsersById,
    documentRole: commentDocumentRole = 'editor',
    visibilityPrivileged: isCommentVisibilityPrivileged,
    collaboratorVisibility,
    sidebar: {
      collapsed: commentsSidebarCollapsed,
      width: commentsSidebarWidth,
      onWidthChange: onCommentsSidebarWidthChange,
    },
    history: { open: commentHistoryOpen, onOpenChange: onCommentHistoryOpenChange },
  },
  portalContainers: {
    commentsSidebar: commentsSidebarPortalContainer,
    aiBulkActions: aiBulkActionsPortalContainer,
  },
  onAiDiffBodyContentHashChange,
  ref,
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const {
    enabled: commentsEnabled,
    uiEnabled: commentsUiEnabled,
    authorizable: commentsAuthorizable,
    writable: commentsWritable,
  } = resolveNoteCommentsRuntimePolicy(commentsStatus);
  const imageService = useImageService();
  const resourceService = useResourceService();
  const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const selectionSnapshotRef = useRef<NoteSelectionSnapshot | undefined>(undefined);
  const flatBlocksRef = useRef<ReturnType<typeof buildOutlineProjection>['flatBlocks']>([]);
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const effectiveBlockLocalDocWrites = blockLocalDocWrites && pmWriteGuardReady;
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const uploadFile = useMemoizedFn(async (file: File) => {
    if (readOnly) {
      const err = new WisePenError({
        code: FRONTEND_CLIENT_ERROR.VALIDATION,
        source: 'client',
        message: '当前笔记为只读，无法上传图片',
      });
      toast.danger(parseErrorMessage(err));
      throw err;
    }
    if (!file.type.startsWith('image/')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
    }
    try {
      assertImageProxyUploadLimit(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      throw error;
    }
    const { publicUrl } = await imageService.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${resourceId}`,
    });
    return publicUrl;
  });
  const [exportDisplayModeOverride, setExportDisplayModeOverride] =
    useState<AiDiffDisplayMode | null>(null);
  const effectiveAiDiffDisplayMode = exportDisplayModeOverride ?? aiDiffDisplayMode;
  const lastAiDiffPresenceRef = useRef<boolean | null>(null);
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const pendingCommentReferenceRef = useRef<PendingCommentReference | null>(null);
  /** 与 reference 分离：applyPendingCommentReference 会在 createThread 时清空 reference，但 mark 仍需选区 */
  const pendingCommentSelectionRef = useRef<PendingCommentSelection | null>(null);
  const editorRef = useRef<CustomBlockNoteEditor | null>(null);
  const aiDiffBodyContentHashRef = useRef<string | undefined>(undefined);
  const aiDiffBodyContentHashTimerRef = useRef<number | null>(null);
  const commitPendingReferenceForThreadRef = useRef<(threadId: string) => void>(() => undefined);
  const rememberPendingCommentReferenceRef = useRef<() => void>(() => undefined);
  const noteFragment = useNoteYjsFragment(doc);
  const showCommentsUi = commentsUiEnabled;
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const { activeCommentUserId, activeCommentUsername, activeCommentAvatarUrl } =
    resolveActiveCommentUserProfile(commentUser ?? null);
  const activeCommentUserIdLatest = useLatest(activeCommentUserId);
  const commentResolverContextLatest = useLatest({
    activeCommentUserId,
    activeCommentUsername,
    activeCommentAvatarUrl,
    commentUsersById,
    commentUsersYMap,
  });

  useUpdateEffect(() => {
    if (commentsEnabled) {
      syncCommentUserProfileToYMap(commentUsersYMap, activeCommentUserId, {
        username: activeCommentUsername,
        avatarUrl: activeCommentAvatarUrl,
      });
    }
  }, [
    activeCommentAvatarUrl,
    activeCommentUserId,
    activeCommentUsername,
    commentUsersYMap,
    commentsEnabled,
  ]);

  useInlineCommentsSync({
    enabled: commentsEnabled,
    resourceId,
    threadsYMap,
    listInlineComments: resourceService.listInlineComments,
  });

  const editorExtensions = useMemo(() => {
    const extensions = [
      ...collectNoteEditorExtensions(notePluginRegistry),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ];
    if (commentsEnabled) {
      extensions.push(
        // eslint-disable-next-line react-hooks/refs -- 扩展初始化早于 editor 创建，以下 ref 只在扩展运行期回调读取。
        buildCommentsExtension({
          registry: notePluginRegistry,
          resourceId,
          activeCommentUserId,
          getActiveCommentUserId: () => activeCommentUserIdLatest.current,
          commentsAuthorizable,
          isCommentVisibilityPrivileged,
          commentDocumentRole,
          threadsYMap,
          doc,
          resolveUsers: (userIds) =>
            Promise.resolve(
              resolveBlockNoteCommentUsers(userIds, commentResolverContextLatest.current)
            ),
          getEditor: () => editorRef.current,
          getPendingCommentSelection: () => pendingCommentSelectionRef.current,
          getPendingCommentReferenceText: () => pendingCommentReferenceRef.current?.referenceText,
          clearPendingCommentSelection: () => {
            pendingCommentSelectionRef.current = null;
          },
          onThreadDocumentMarked: (threadId) => {
            commitPendingReferenceForThreadRef.current(threadId);
          },
          canAddThreadToDocument: (editor) => isCommentableSelection(editor, notePluginRegistry),
          inlineCommentDataSource: {
            listInlineComments: resourceService.listInlineComments,
            createInlineComment: resourceService.createInlineComment,
            addInlineCommentItem: resourceService.addInlineCommentItem,
            updateInlineCommentItem: resourceService.updateInlineCommentItem,
            deleteInlineCommentItem: resourceService.deleteInlineCommentItem,
            changeInlineCommentResolveStatus: resourceService.changeInlineCommentResolveStatus,
          },
        })
      );
    }
    return extensions;
  }, [
    activeCommentUserId,
    commentDocumentRole,
    commentsEnabled,
    commentsAuthorizable,
    isCommentVisibilityPrivileged,
    resourceId,
    resourceService,
    threadsYMap,
    doc,
    shouldBlockLocalDocWrites,
    activeCommentUserIdLatest,
    commentResolverContextLatest,
  ]);
  const editorProps = useMemo(
    () =>
      mergeReadOnlyEditorProps(
        collectNoteEditorProps(notePluginRegistry),
        effectiveBlockLocalDocWrites
      ),
    [effectiveBlockLocalDocWrites]
  );

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    dictionary: zh,
    trailingBlock: true,
    disableExtensions: ['history', 'yUndo'],
    uploadFile,
    extensions: editorExtensions,
    _tiptapOptions: {
      editorProps,
    },
    collaboration: {
      provider: provider as BlockNoteCollaborationConfig['provider'],
      fragment: noteFragment,
      user: collaborationUser,
    },
  });
  const undoManager = useNoteYjsUndoManager(noteFragment, editor);

  const refreshAiDiffBodyContentHash = useMemoizedFn(() => {
    const nextHash = computeNoteBodyContentHash(editor.document);
    aiDiffBodyContentHashRef.current = nextHash;
    onAiDiffBodyContentHashChange?.(nextHash);
  });

  const scheduleAiDiffBodyContentHashRefresh = useMemoizedFn(() => {
    aiDiffBodyContentHashRef.current = undefined;
    onAiDiffBodyContentHashChange?.(undefined);
    if (aiDiffBodyContentHashTimerRef.current !== null) {
      window.clearTimeout(aiDiffBodyContentHashTimerRef.current);
    }
    aiDiffBodyContentHashTimerRef.current = window.setTimeout(() => {
      aiDiffBodyContentHashTimerRef.current = null;
      refreshAiDiffBodyContentHash();
    }, 120);
  });

  useMount(() => {
    editorRef.current = editor;
    scheduleAiDiffBodyContentHashRefresh();
  });

  useUpdateEffect(() => {
    editorRef.current = editor;
    scheduleAiDiffBodyContentHashRefresh();
  }, [editor]);

  const syncCollaborationUser = () => {
    const yCursor = editor.getExtension('yCursor') as YCursorExtensionHandle | undefined;
    yCursor?.updateUser?.(collaborationUser);
  };

  useMount(() => {
    syncCollaborationUser();
  });

  useUpdateEffect(() => {
    syncCollaborationUser();
  }, [collaborationUser, editor]);

  useMount(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  });

  useUpdateEffect(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  }, [effectiveAiDiffDisplayMode, editor]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);

  useUpdateEffect(() => {
    try {
      editor.prosemirrorView.setProps(editorProps);
    } catch {
      void 0;
    }
  }, [editorProps, editor]);

  const syncAiDiffPresence = useCallback(() => {
    const nextHasAiDiffContent = hasAiDiffContentFromEditor(editor, notePluginRegistry);
    if (lastAiDiffPresenceRef.current === nextHasAiDiffContent) {
      return;
    }

    lastAiDiffPresenceRef.current = nextHasAiDiffContent;
    setHasAiDiffContent(nextHasAiDiffContent);
    onAiDiffPresenceChange?.(nextHasAiDiffContent);
  }, [editor, onAiDiffPresenceChange]);

  useAiDiffNormalization({
    doc,
    noteFragment,
    editor,
    provider,
    registry: notePluginRegistry,
    onNormalized: syncAiDiffPresence,
  });

  useMount(() => {
    syncAiDiffPresence();
  });

  useMount(() => {
    let writeGuardActivated = false;
    const activateWriteGuard = () => {
      if (writeGuardActivated || !hasBlockLocalDocWritesProp()) {
        return;
      }
      writeGuardActivated = true;
      setPmWriteGuardReady(true);
    };

    const syncOutlineProjection = () => {
      if (!onOutlineChange && !onActiveHeadingChange) return;
      const projection = buildOutlineProjection(editor);
      flatBlocksRef.current = projection.flatBlocks;
      onOutlineChange?.(projection.items);
    };

    newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
      activateWriteGuard();
      scheduleAiDiffBodyContentHashRefresh();

      const newNoteState = useNewNoteStore.getState();
      if (
        newNoteState.newNoteResourceId === resourceId &&
        editor.blocksToMarkdownLossy().trim().length > 0
      ) {
        newNoteState.markNewNoteDirty(resourceId);
      }
      syncAiDiffPresence();

      syncOutlineProjection();
    });

    syncOutlineProjection();

    if (hasBlockLocalDocWritesProp()) {
      window.requestAnimationFrame(activateWriteGuard);
    }
  });

  const applyPendingMarkdownImport = useMemoizedFn(() => {
    if (!collaborationReady) {
      return;
    }

    const pendingImport = usePendingNoteImportStore.getState().pendingByResourceId[resourceId];
    if (!pendingImport) {
      return;
    }

    try {
      const blocks = importNoteMarkdown(editor, notePluginRegistry, pendingImport.markdown);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.success(`已导入 ${pendingImport.sourceFileName}`);
    } catch (error) {
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.danger(`Markdown 导入失败：${parseErrorMessage(error)}`);
    }
  });

  useMount(() => {
    applyPendingMarkdownImport();
  });

  useUpdateEffect(() => {
    applyPendingMarkdownImport();
  }, [collaborationReady, resourceId]);

  useUpdateEffect(() => {
    if (!blockLocalDocWrites) {
      setPmWriteGuardReady(false);
    }
  }, [blockLocalDocWrites]);

  useUnmount(() => {
    if (newNoteBodyOnChangeCleanupRef.current) {
      newNoteBodyOnChangeCleanupRef.current();
      newNoteBodyOnChangeCleanupRef.current = null;
    }
    if (aiDiffBodyContentHashTimerRef.current !== null) {
      window.clearTimeout(aiDiffBodyContentHashTimerRef.current);
      aiDiffBodyContentHashTimerRef.current = null;
    }
  });

  const {
    latexCommentProviderProps,
    rememberPendingCommentReference,
    commitPendingReferenceForThread,
    bumpFormulaState,
    visibleThreadReferenceTexts,
    formulaThreadPositions,
  } = useFormulaComments({
    editor,
    doc,
    resourceId,
    commentsEnabled,
    commentsWritable,
    readOnly,
    commentUserId: activeCommentUserId,
    isCommentVisibilityPrivileged,
    collaboratorVisibility,
    pendingCommentReferenceRef,
    pendingCommentSelectionRef,
  });

  useMount(() => {
    commitPendingReferenceForThreadRef.current = commitPendingReferenceForThread;
    rememberPendingCommentReferenceRef.current = rememberPendingCommentReference;
  });

  useUpdateEffect(() => {
    commitPendingReferenceForThreadRef.current = commitPendingReferenceForThread;
    rememberPendingCommentReferenceRef.current = rememberPendingCommentReference;
  }, [commitPendingReferenceForThread, rememberPendingCommentReference]);

  useSyncCommentDocumentMarks({
    editor,
    registry: notePluginRegistry,
    doc,
    provider,
    commentsEnabled,
    commentUserId: activeCommentUserId,
    isCommentVisibilityPrivileged,
    collaboratorVisibility,
    onAfterDocumentMarksSync: bumpFormulaState,
  });

  useUpdateEffect(() => {
    if (!commentsEnabled || !commentsWritable) {
      return;
    }
    const extension = editor.getExtension('comments') as
      { startPendingComment?: () => void } | undefined;
    if (!extension?.startPendingComment) {
      return;
    }
    const originalStartPendingComment = extension.startPendingComment.bind(extension);
    extension.startPendingComment = () => {
      rememberPendingCommentReferenceRef.current();
      originalStartPendingComment();
    };
    return () => {
      extension.startPendingComment = originalStartPendingComment;
    };
  }, [commentsEnabled, commentsWritable, editor]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor.focus();
      },
      navigateToBlock: (id: string) => {
        try {
          editor.setTextCursorPosition(id, 'start');
          editor.focus();
          const view = (
            editor as unknown as {
              prosemirrorView?: { state?: { tr?: unknown }; dispatch?: unknown };
            }
          ).prosemirrorView;
          const canScroll =
            typeof view?.dispatch === 'function' &&
            view?.state &&
            isRecord(view.state) &&
            'tr' in view.state &&
            isRecord(view.state.tr) &&
            typeof (view.state.tr as { scrollIntoView?: unknown }).scrollIntoView === 'function';
          if (canScroll) {
            window.requestAnimationFrame(() => {
              try {
                (view.dispatch as (tr: unknown) => void)(
                  (view.state as { tr: { scrollIntoView: () => unknown } }).tr.scrollIntoView()
                );
              } catch {
                void 0;
              }
            });
          }
        } catch {
          editor.focus();
        }
      },
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, notePluginRegistry, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
          try {
            syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, aiDiffDisplayMode);
          } catch {
            void 0;
          }
        }
      },
      exportMarkdown: () => {
        return {
          content: exportNoteMarkdown(
            editor,
            notePluginRegistry,
            editor.document,
            AI_DIFF_DISPLAY_MODE.OLD_ONLY
          ),
          mimeType: 'text/markdown;charset=utf-8',
          extension: 'md',
        };
      },
    }),
    [aiDiffDisplayMode, editor]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  const handleSelectionChange = () => {
    selectionSnapshotRef.current = {
      text: editor.getSelectedText(),
      scope: buildSelectedNoteScope(editor),
    };
    if (commentsEnabled && commentsWritable && isCommentableSelection(editor, notePluginRegistry)) {
      const selection = capturePendingCommentSelection(editor);
      if (selection) {
        pendingCommentSelectionRef.current = selection;
      }
    }
    if (!onActiveHeadingChange) {
      return;
    }
    let activeId: string | undefined;
    try {
      const cursor = editor.getTextCursorPosition();
      const currentId = cursor.block?.id;
      if (!currentId) {
        onActiveHeadingChange(undefined);
        return;
      }
      activeId = resolveActiveHeadingId(flatBlocksRef.current, currentId);
    } catch {
      activeId = undefined;
    }
    onActiveHeadingChange(activeId);
  };

  const handleAskAi = () => {
    const selectedText =
      editor.getSelectedText().trim() || selectionSnapshotRef.current?.text.trim() || '';
    if (!selectedText) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    onAskAi({
      text: selectedText,
      scope: buildSelectedNoteScope(editor) ?? selectionSnapshotRef.current?.scope ?? null,
    });
  };

  const showAiBulkActions =
    hasAiDiffContent && !readOnly && aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE;

  const hasInlineCommentsSidebar =
    showCommentsUi && !commentsSidebarCollapsed && commentsSidebarPortalContainer === undefined;
  const editorShellStyle = hasInlineCommentsSidebar
    ? ({ ['--comments-sidebar-width' as string]: `${commentsSidebarWidth}px` } as CSSProperties)
    : undefined;
  return (
    <div
      className={clsx(
        styles.editorShell,
        showCommentsUi && commentStyles.editorShellWithComments,
        hasInlineCommentsSidebar && commentStyles.withCommentsSidebar
      )}
      style={editorShellStyle}
      onKeyDownCapture={onKeyDownCapture}
    >
      <AiDiffBulkActions
        editor={editor}
        registry={notePluginRegistry}
        visible={showAiBulkActions}
        portalContainer={aiBulkActionsPortalContainer}
        onApplied={syncAiDiffPresence}
      />
      <NoteEditorReadOnlyProvider value={readOnly}>
        <AiDiffDisplayModeProvider value={effectiveAiDiffDisplayMode}>
          <LatexCommentProvider {...latexCommentProviderProps}>
            <BlockNoteView
              className={commentStyles.bodyBlockNoteView}
              editor={editor}
              theme="light"
              formattingToolbar={false}
              slashMenu={false}
              sideMenu={false}
              tableHandles={false}
              comments={false}
              editable={!readOnly}
              onSelectionChange={handleSelectionChange}
            >
              <NoteToolbar
                onAskAi={handleAskAi}
                showAddComment={commentsWritable}
                onRememberPendingCommentReference={() => {
                  syncDomSelectionToProseMirror(editor);
                  rememberPendingCommentReference();
                }}
              />
              <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
              <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
              <NoteTableHandles />
              {showCommentsUi ? (
                <NoteCommentsUi
                  editor={editor}
                  doc={doc}
                  commentsEnabled={commentsEnabled}
                  commentsWritable={commentsWritable}
                  commentUserId={activeCommentUserId}
                  commentUsername={activeCommentUsername}
                  commentAvatarUrl={activeCommentAvatarUrl}
                  commentUsersById={commentUsersById}
                  isCommentVisibilityPrivileged={isCommentVisibilityPrivileged}
                  collaboratorVisibility={collaboratorVisibility}
                  sidebarCollapsed={commentsSidebarCollapsed}
                  sidebarWidth={commentsSidebarWidth}
                  onSidebarWidthChange={onCommentsSidebarWidthChange}
                  sidebarPortalContainer={commentsSidebarPortalContainer}
                  commentHistoryOpen={commentHistoryOpen}
                  onCommentHistoryOpenChange={onCommentHistoryOpenChange}
                  localThreadReferenceTexts={visibleThreadReferenceTexts}
                  formulaThreadPositions={formulaThreadPositions}
                  onBumpThreadsSidebar={bumpFormulaState}
                />
              ) : null}
            </BlockNoteView>
          </LatexCommentProvider>
        </AiDiffDisplayModeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;

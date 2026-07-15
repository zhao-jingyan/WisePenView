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
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { buildOutlineProjection, resolveActiveHeadingId } from './content/outline';
import { AiDiffBulkActions } from './engines/aiDiff/BulkActions';
import { initializeAiDiffPreview } from './engines/aiDiff/preview';
import { AI_DIFF_ACTION_ORIGIN, getAiContentStore } from './engines/aiDiff/store';
import { useAiDiffSidecarRuntime } from './engines/aiDiff/useAiDiffSidecarRuntime';
import { useNoteCaptureKeyEvent } from './engines/collaboration/useNoteCaptureKeyEvent';
import {
  useAttachNoteYjsUndoStack,
  useNoteYjsFragment,
  useNoteYjsUndoManager,
} from './engines/collaboration/useNoteYjsUndoStack';
import {
  createNoteReadOnlyFilterExtension,
  NoteEditorReadOnlyProvider,
} from './engines/editor/readOnly';
import {
  buildInlineCommentExtension,
  capturePendingInlineCommentSelection,
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
  isInlineCommentableSelection,
  NoteInlineCommentRuntimeProvider,
  NoteInlineCommentUi,
  resolveActiveInlineCommentUserProfile,
  resolveBlockNoteInlineCommentUsers,
  resolveNoteInlineCommentRuntimeState,
  syncDomSelectionToProseMirror,
  useContentInlineComments,
  useRemoteInlineCommentSync,
  useSyncInlineCommentDocumentMarks,
  type PendingInlineCommentReference,
  type PendingInlineCommentSelection,
} from './engines/inlineComment';
import { syncInlineCommentUserProfileToYMap } from './engines/inlineComment/threads/users';
import { exportNoteMarkdown } from './engines/markdown/markdownExport';
import { importNoteMarkdown } from './engines/markdown/markdownImport';
import { printNotePdfViaBrowser, waitForEditorPaint } from './engines/print/noteBrowserPrint';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
  type CustomBlockNoteEditor,
} from './noteEditorComposition';
import styles from './style.module.less';
import NoteSideMenu from './ui/sideMenu';
import NoteSlashMenu from './ui/slashMenu';
import NoteTableHandles from './ui/tableHandles';
import NoteToolbar from './ui/toolbar';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type CollaborationUser = {
  name: string;
  color: string;
};
type YCursorExtensionHandle = {
  updateUser?: (user: CollaborationUser) => void;
};

const AI_DIFF_TRACKED_ORIGINS = [AI_DIFF_ACTION_ORIGIN] as const;
const NOTE_EDITOR_PROPS = collectNoteEditorProps(notePluginRegistry);

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
  aiDiffPreview,
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  onAskAi,
  inlineComment: {
    status: inlineCommentStatus,
    actor: inlineCommentActor,
    usersById: inlineCommentUsersById,
    documentRole: inlineCommentDocumentRole,
    visibilityPrivileged: isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
    onOpen: onOpenInlineComment,
    history: { open: inlineCommentHistoryOpen, onOpenChange: onInlineCommentHistoryOpenChange },
  },
  portalContainers: {
    inlineCommentSidebar: inlineCommentSidebarPortalContainer,
    aiBulkActions: aiBulkActionsPortalContainer,
  },
  onAiDiffBodyContentHashChange,
  ref,
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const {
    enabled: inlineCommentEnabled,
    uiEnabled: inlineCommentUiEnabled,
    hasWritePermission: hasInlineCommentWritePermission,
    canWrite: inlineCommentWritable,
  } = resolveNoteInlineCommentRuntimeState(inlineCommentStatus);
  const imageService = useImageService();
  const resourceService = useResourceService();
  const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const selectionSnapshotRef = useRef<NoteSelectionSnapshot | undefined>(undefined);
  const flatBlocksRef = useRef<ReturnType<typeof buildOutlineProjection>['flatBlocks']>([]);
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
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
  const pendingInlineCommentReferenceRef = useRef<PendingInlineCommentReference | null>(null);
  /** 与 reference 分离：applyPendingInlineCommentReference 会在 createThread 时清空 reference，但 mark 仍需选区 */
  const pendingInlineCommentSelectionRef = useRef<PendingInlineCommentSelection | null>(null);
  const editorRef = useRef<CustomBlockNoteEditor | null>(null);
  const aiDiffBodyContentHashTimerRef = useRef<number | null>(null);
  const commitPendingInlineCommentReferenceForThreadRef = useRef<(threadId: string) => void>(
    () => undefined
  );
  const noteFragment = useNoteYjsFragment(doc);
  const aiContentStore = getAiContentStore(doc);
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const inlineCommentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const { activeInlineCommentUserId, activeInlineCommentUsername, activeInlineCommentAvatarUrl } =
    resolveActiveInlineCommentUserProfile(inlineCommentActor ?? null);
  const activeInlineCommentUserIdLatest = useLatest(activeInlineCommentUserId);
  const inlineCommentResolverContextLatest = useLatest({
    activeInlineCommentUserId,
    activeInlineCommentUsername,
    activeInlineCommentAvatarUrl,
    inlineCommentUsersById,
    inlineCommentUsersYMap,
  });

  useUpdateEffect(() => {
    if (inlineCommentEnabled) {
      syncInlineCommentUserProfileToYMap(inlineCommentUsersYMap, activeInlineCommentUserId, {
        username: activeInlineCommentUsername,
        avatarUrl: activeInlineCommentAvatarUrl,
      });
    }
  }, [
    activeInlineCommentAvatarUrl,
    activeInlineCommentUserId,
    activeInlineCommentUsername,
    inlineCommentUsersYMap,
    inlineCommentEnabled,
  ]);

  useRemoteInlineCommentSync({
    enabled: inlineCommentEnabled,
    resourceId,
    threadsYMap,
    listInlineComments: resourceService.listInlineComments,
  });

  const editorExtensions = useMemo(() => {
    const extensions = [
      ...collectNoteEditorExtensions(notePluginRegistry),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ];
    if (inlineCommentEnabled) {
      extensions.push(
        // eslint-disable-next-line react-hooks/refs -- 扩展初始化早于 editor 创建，以下 ref 只在扩展运行期回调读取。
        buildInlineCommentExtension({
          registry: notePluginRegistry,
          resourceId,
          getActiveCommentUserId: () => activeInlineCommentUserIdLatest.current,
          hasWritePermission: hasInlineCommentWritePermission,
          isInlineCommentVisibilityPrivileged,
          inlineCommentDocumentRole,
          threadsYMap,
          doc,
          resolveUsers: (userIds) =>
            Promise.resolve(
              resolveBlockNoteInlineCommentUsers(
                userIds,
                inlineCommentResolverContextLatest.current
              )
            ),
          getEditor: () => editorRef.current,
          getPendingInlineCommentSelection: () => pendingInlineCommentSelectionRef.current,
          getPendingInlineCommentReferenceText: () =>
            pendingInlineCommentReferenceRef.current?.referenceText,
          clearPendingInlineCommentSelection: () => {
            pendingInlineCommentSelectionRef.current = null;
          },
          onThreadDocumentMarked: (threadId) => {
            commitPendingInlineCommentReferenceForThreadRef.current(threadId);
          },
          canAddThreadToDocument: (editor) =>
            isInlineCommentableSelection(editor, notePluginRegistry),
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
    inlineCommentDocumentRole,
    inlineCommentEnabled,
    hasInlineCommentWritePermission,
    isInlineCommentVisibilityPrivileged,
    resourceId,
    resourceService,
    threadsYMap,
    doc,
    shouldBlockLocalDocWrites,
    activeInlineCommentUserIdLatest,
    inlineCommentResolverContextLatest,
  ]);
  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    dictionary: zh,
    trailingBlock: true,
    disableExtensions: ['history', 'yUndo'],
    uploadFile,
    extensions: editorExtensions,
    _tiptapOptions: {
      editorProps: NOTE_EDITOR_PROPS,
    },
    collaboration: {
      provider: provider as BlockNoteCollaborationConfig['provider'],
      fragment: noteFragment,
      user: collaborationUser,
    },
  });
  const undoManager = useNoteYjsUndoManager(
    noteFragment,
    aiContentStore,
    editor,
    AI_DIFF_TRACKED_ORIGINS
  );

  const refreshAiDiffBodyContentHash = useMemoizedFn(() => {
    const nextHash = computeNoteBodyContentHash(editor.document);
    onAiDiffBodyContentHashChange?.(nextHash);
  });

  const scheduleAiDiffBodyContentHashRefresh = useMemoizedFn(() => {
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

  useAttachNoteYjsUndoStack(doc, editor, undoManager);

  const hasAiDiffContent = useAiDiffSidecarRuntime({
    doc,
    noteFragment,
    editor,
    registry: notePluginRegistry,
    displayMode: effectiveAiDiffDisplayMode,
    readOnly: readOnly || blockLocalDocWrites,
    undoManager,
    onPresenceChange: onAiDiffPresenceChange,
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
      const projection = buildOutlineProjection(editor, notePluginRegistry);
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

  const applyAiDiffPreview = useMemoizedFn(() => {
    if (!collaborationReady || !aiDiffPreview) return;
    if (initializeAiDiffPreview({ doc, editor, preview: aiDiffPreview })) {
      undoManager.clear();
      scheduleAiDiffBodyContentHashRefresh();
    }
  });

  useMount(() => {
    applyAiDiffPreview();
  });

  useUpdateEffect(() => {
    applyAiDiffPreview();
  }, [aiDiffPreview, collaborationReady, resourceId]);

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
    runtimeProviderProps,
    rememberPendingInlineCommentReference,
    commitPendingInlineCommentReferenceForThread,
    bumpInlineCommentState,
    visibleThreadReferenceTexts,
    inlineCommentThreadPositions,
  } = useContentInlineComments({
    editor,
    doc,
    registry: notePluginRegistry,
    inlineCommentEnabled,
    inlineCommentWritable,
    readOnly,
    inlineCommentUserId: activeInlineCommentUserId,
    isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
    pendingInlineCommentReferenceRef,
    pendingInlineCommentSelectionRef,
    onOpenInlineComment,
  });

  useMount(() => {
    commitPendingInlineCommentReferenceForThreadRef.current =
      commitPendingInlineCommentReferenceForThread;
  });

  useUpdateEffect(() => {
    commitPendingInlineCommentReferenceForThreadRef.current =
      commitPendingInlineCommentReferenceForThread;
  }, [commitPendingInlineCommentReferenceForThread]);

  useSyncInlineCommentDocumentMarks({
    editor,
    registry: notePluginRegistry,
    doc,
    provider,
    inlineCommentEnabled,
    inlineCommentUserId: activeInlineCommentUserId,
    isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
    onAfterDocumentMarksSync: bumpInlineCommentState,
  });

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
          const view = editor.prosemirrorView;
          window.requestAnimationFrame(() => view.dispatch(view.state.tr.scrollIntoView()));
        } catch {
          editor.focus();
        }
      },
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, notePluginRegistry, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
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
    [editor]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  const handleSelectionChange = () => {
    selectionSnapshotRef.current = {
      text: editor.getSelectedText(),
      scope: buildSelectedNoteScope(editor),
    };
    if (
      inlineCommentEnabled &&
      inlineCommentWritable &&
      isInlineCommentableSelection(editor, notePluginRegistry)
    ) {
      const selection = capturePendingInlineCommentSelection(editor);
      if (selection) {
        pendingInlineCommentSelectionRef.current = selection;
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
    hasAiDiffContent &&
    !readOnly &&
    !blockLocalDocWrites &&
    aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE;

  return (
    <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
      <AiDiffBulkActions
        doc={doc}
        editor={editor}
        registry={notePluginRegistry}
        undoManager={undoManager}
        visible={showAiBulkActions}
        portalContainer={aiBulkActionsPortalContainer}
      />
      <NoteEditorReadOnlyProvider value={readOnly}>
        <NoteInlineCommentRuntimeProvider {...runtimeProviderProps}>
          <BlockNoteView
            className="bodyBlockNoteView"
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
              showAddInlineComment={inlineCommentWritable}
              onRememberPendingInlineCommentReference={() => {
                syncDomSelectionToProseMirror(editor);
                rememberPendingInlineCommentReference();
              }}
            />
            <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
            <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
            <NoteTableHandles />
            {inlineCommentUiEnabled ? (
              <NoteInlineCommentUi
                editor={editor}
                doc={doc}
                registry={notePluginRegistry}
                inlineCommentWritable={inlineCommentWritable}
                inlineCommentUserId={activeInlineCommentUserId}
                inlineCommentUsername={activeInlineCommentUsername}
                inlineCommentAvatarUrl={activeInlineCommentAvatarUrl}
                inlineCommentUsersById={inlineCommentUsersById}
                isInlineCommentVisibilityPrivileged={isInlineCommentVisibilityPrivileged}
                collaboratorVisibility={collaboratorVisibility}
                inlineCommentSidebarPortalContainer={inlineCommentSidebarPortalContainer}
                inlineCommentHistoryOpen={inlineCommentHistoryOpen}
                onInlineCommentHistoryOpenChange={onInlineCommentHistoryOpenChange}
                localThreadReferenceTexts={visibleThreadReferenceTexts}
                inlineCommentThreadPositions={inlineCommentThreadPositions}
                onBumpInlineCommentSidebar={bumpInlineCommentState}
              />
            ) : null}
          </BlockNoteView>
        </NoteInlineCommentRuntimeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;

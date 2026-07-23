import {
  DriveCreate,
  ResourcePermissionModal,
  TagMountPermissionModal,
  TagPermissionModal,
  UploadDocumentModal,
  UploadFileToGroupModal,
  type DriveCreateType,
  type ResourcePermissionModalTarget,
} from '@/components/Drive/Modals';
import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/Note/useMarkdownNoteImport';
import { useDocumentService, useDriveService, useNoteService, useResourceService } from '@/domains';
import type { DriveNodeScope } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { mountResourceToFolderTag, resolveCurrentFolderTagId } from '../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from './index.type';
import type { CreateMenuItem } from './parts/CreateMenu/index.type';

export interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  scope: DriveNodeScope;
  actions?: TableDriveActionConfig;
  refresh: () => void;
  targetTagId?: string;
  isTrashView?: boolean;
}

export interface UseTableDriveActionsReturn {
  showCreateMenu: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  createMenuItems: CreateMenuItem[];
  handleCreateMenuSelect: (id: CreateMenuItem['id']) => void;
  openUploadToGroup: () => void;
  openTagAccessPermission: (tagId: string) => void;
  openTagMountPermission: (tagId: string) => void;
  openResourcePermission: (target: ResourcePermissionModalTarget) => void;
  tagPermissionRefreshToken: number;
  resourcePermissionRefreshToken: number;
  ModalHost: ReactElement;
}

const DEFAULT_TOOLBAR_CONFIG: Required<NonNullable<TableDriveActionConfig['toolbar']>> = {
  canCreateFolder: true,
  canCreateNote: true,
  canCreateDrawio: true,
  canCreateSkill: true,
  canCreateAgent: true,
  canUploadToGroup: false,
  canManageTagPermission: false,
};

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  scope,
  actions,
  refresh,
  targetTagId,
  isTrashView = false,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const openInWorkspace = useOpenInWorkspace();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const noteService = useNoteService();
  const driveService = useDriveService();
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagAccessPermissionTagId, setTagAccessPermissionTagId] = useState<string>();
  const [tagMountPermissionTagId, setTagMountPermissionTagId] = useState<string>();
  const [tagPermissionRefreshToken, setTagPermissionRefreshToken] = useState(0);
  const [resourcePermissionTarget, setResourcePermissionTarget] =
    useState<ResourcePermissionModalTarget | null>(null);
  const [resourcePermissionRefreshToken, setResourcePermissionRefreshToken] = useState(0);
  const [driveCreateType, setDriveCreateType] = useState<DriveCreateType | null>(null);

  const existingFolderNames = useMemo(
    () => currentRows.filter((row) => row.node.type === 'folder').map((row) => row.name.trim()),
    [currentRows]
  );

  const mountTagId = useMemo(
    () => resolveCurrentFolderTagId(currentNodeId, []) ?? targetTagId,
    [currentNodeId, targetTagId]
  );

  const mountCreatedResource = useCallback(
    async (resourceId: string) => {
      if (!mountTagId) return;
      if (groupId) {
        const sharedTagId = await driveService.ensureSharedFolder();
        await mountResourceToFolderTag({
          resourceId,
          targetTagId: sharedTagId,
          documentService,
          resourceService,
        });
        await resourceService.mountResourcesToGroupTag({
          resourceIds: [resourceId],
          groupId,
          tagId: mountTagId,
        });
        return;
      }
      await mountResourceToFolderTag({
        resourceId,
        targetTagId: mountTagId,
        documentService,
        resourceService,
      });
    },
    [documentService, driveService, groupId, mountTagId, resourceService]
  );

  const {
    fileInputRef: markdownFileInputRef,
    importing: importingMarkdownNote,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    mountCreatedResource,
    onSuccess: ({ resourceId, title }) => {
      refresh();
      openInWorkspace({
        resourceId,
        resourceType: RESOURCE_KIND.NOTE,
        resourceName: title,
        driveLocation: { scope, parentNodeId: currentNodeId },
      });
    },
  });

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (resourceId) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        refresh();
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          driveLocation: { scope, parentNodeId: currentNodeId },
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleDriveCreateSuccess = useCallback(
    async (createdId: string, type: DriveCreateType) => {
      if (type === 'folder') {
        setDriveCreateType(null);
        refresh();
        return;
      }
      await mountCreatedResource(createdId);
      setDriveCreateType(null);
      refresh();
      openInWorkspace({
        resourceId: createdId,
        resourceType: type,
        driveLocation: { scope, parentNodeId: currentNodeId },
      });
    },
    [currentNodeId, mountCreatedResource, openInWorkspace, refresh, scope]
  );

  const ModalHost = useMemo(
    () => (
      <>
        <input
          ref={markdownFileInputRef}
          type="file"
          accept={MARKDOWN_NOTE_FILE_ACCEPT}
          onChange={handleMarkdownFileChange}
          hidden
        />
        <UploadDocumentModal
          isOpen={uploadDocumentOpen}
          onOpenChange={setUploadDocumentOpen}
          onSuccess={refresh}
        />
        {groupId && uploadOpen ? (
          <UploadFileToGroupModal
            isOpen={uploadOpen}
            groupId={groupId}
            onOpenChange={setUploadOpen}
            onSuccess={refresh}
          />
        ) : null}
        {groupId && tagAccessPermissionTagId ? (
          <TagPermissionModal
            isOpen={Boolean(tagAccessPermissionTagId)}
            groupId={groupId}
            initialTagId={tagAccessPermissionTagId}
            onOpenChange={(open) => {
              if (!open) {
                setTagAccessPermissionTagId(undefined);
              }
            }}
            onSuccess={() => setTagPermissionRefreshToken((prev) => prev + 1)}
          />
        ) : null}
        {groupId && tagMountPermissionTagId ? (
          <TagMountPermissionModal
            isOpen={Boolean(tagMountPermissionTagId)}
            groupId={groupId}
            initialTagId={tagMountPermissionTagId}
            onOpenChange={(open) => {
              if (!open) {
                setTagMountPermissionTagId(undefined);
              }
            }}
            onSuccess={() => setTagPermissionRefreshToken((prev) => prev + 1)}
          />
        ) : null}
        {groupId && resourcePermissionTarget ? (
          <ResourcePermissionModal
            isOpen={Boolean(resourcePermissionTarget)}
            groupId={groupId}
            target={resourcePermissionTarget}
            onOpenChange={(open) => {
              if (!open) {
                setResourcePermissionTarget(null);
              }
            }}
            onSuccess={() => setResourcePermissionRefreshToken((prev) => prev + 1)}
          />
        ) : null}
        {driveCreateType ? (
          <DriveCreate
            type={driveCreateType}
            isOpen
            parentId={currentNodeId}
            groupId={groupId}
            existingFolderNames={existingFolderNames}
            onOpenChange={(open) => {
              if (!open) setDriveCreateType(null);
            }}
            onSuccess={handleDriveCreateSuccess}
          />
        ) : null}
      </>
    ),
    [
      currentNodeId,
      driveCreateType,
      existingFolderNames,
      groupId,
      handleDriveCreateSuccess,
      handleMarkdownFileChange,
      markdownFileInputRef,
      refresh,
      resourcePermissionTarget,
      tagAccessPermissionTagId,
      tagMountPermissionTagId,
      uploadDocumentOpen,
      uploadOpen,
    ]
  );

  const openUploadDocument = useCallback(() => {
    setUploadDocumentOpen(true);
  }, []);

  const openUploadToGroup = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const openTagAccessPermission = useCallback((tagId: string) => {
    setTagAccessPermissionTagId(tagId);
  }, []);

  const openTagMountPermission = useCallback((tagId: string) => {
    setTagMountPermissionTagId(tagId);
  }, []);

  const openResourcePermission = useCallback((target: ResourcePermissionModalTarget) => {
    setResourcePermissionTarget(target);
  }, []);

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (!groupId && pendingNewNoteId) {
      openInWorkspace({
        resourceId: pendingNewNoteId,
        resourceType: RESOURCE_KIND.NOTE,
        driveLocation: { scope, parentNodeId: currentNodeId },
      });
      return;
    }
    runCreateNote();
  }, [creatingNote, currentNodeId, groupId, openInWorkspace, runCreateNote, scope]);

  const handleCreateMenuSelect = useCallback(
    (id: CreateMenuItem['id']) => {
      switch (id) {
        case 'folder':
        case 'drawio':
        case 'skill':
        case 'agent':
          setDriveCreateType(id);
          break;
        case 'note':
          handleCreateNote();
          break;
        case 'importNote':
          openMarkdownFilePicker();
          break;
        case 'upload':
          openUploadDocument();
          break;
      }
    },
    [handleCreateNote, openMarkdownFilePicker, openUploadDocument]
  );

  const showUploadDocument =
    scope.type === 'personal' && currentNodeId === scope.rootId && !isTrashView;

  const canCreateInCurrentFolder = Boolean(mountTagId);

  const showCreateMenu = Boolean(
    !isTrashView &&
    (toolbarConfig.canCreateFolder ||
      (canCreateInCurrentFolder &&
        (toolbarConfig.canCreateNote ||
          toolbarConfig.canCreateDrawio ||
          toolbarConfig.canCreateSkill ||
          toolbarConfig.canCreateAgent ||
          showUploadDocument)))
  );

  const createMenuItems = useMemo<CreateMenuItem[]>(() => {
    if (!showCreateMenu) return [];
    const items: CreateMenuItem[] = [];
    if (toolbarConfig.canCreateFolder) {
      items.push({ id: 'folder', label: '新建文件夹' });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateDrawio) {
      items.push({ id: 'drawio', label: '新建图表' });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateNote) {
      items.push({ id: 'note', label: '新建笔记', disabled: creatingNote });
      items.push({
        id: 'importNote',
        label: '导入笔记',
        disabled: importingMarkdownNote,
      });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateSkill) {
      items.push({ id: 'skill', label: '新建 Skill' });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateAgent)
      items.push({ id: 'agent', label: '新建 Agent' });
    if (showUploadDocument) {
      items.push({ id: 'upload', label: '上传文件' });
    }
    return items;
  }, [
    canCreateInCurrentFolder,
    creatingNote,
    importingMarkdownNote,
    showCreateMenu,
    showUploadDocument,
    toolbarConfig.canCreateDrawio,
    toolbarConfig.canCreateFolder,
    toolbarConfig.canCreateNote,
    toolbarConfig.canCreateSkill,
    toolbarConfig.canCreateAgent,
  ]);

  return {
    showCreateMenu,
    showUploadToGroup: Boolean(toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagAccessPermission,
    openTagMountPermission,
    openResourcePermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    ModalHost,
  };
}

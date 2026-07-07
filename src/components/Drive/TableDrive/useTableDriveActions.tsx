import {
  NewFolderNodeModal,
  ResourcePermissionModal,
  TagPermissionModal,
  UploadDocumentModal,
  UploadFileToGroupModal,
  type ResourcePermissionModalTarget,
} from '@/components/Drive/Modals';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useDocumentService, useNoteService, useResourceService } from '@/domains';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useNewNoteStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Input, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { mountResourceToFolderTag, resolveCurrentFolderTagId } from '../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from './index.type';
import type { CreateMenuItem } from './parts/CreateMenu/index.type';

export interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  groupId?: string;
  actions?: TableDriveActionConfig;
  refresh: () => void;
  onUploadSuccess?: () => void;
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
  openTagPermission: (tagId?: string) => void;
  openResourcePermission: (target: ResourcePermissionModalTarget) => void;
  tagPermissionRefreshToken: number;
  resourcePermissionRefreshToken: number;
  ModalHost: ReactElement;
}

const DEFAULT_TOOLBAR_CONFIG: Required<NonNullable<TableDriveActionConfig['toolbar']>> = {
  canCreateFolder: true,
  canCreateNote: true,
  canCreateDrawio: true,
  canUploadDocument: true,
  canUploadToGroup: false,
  canManageTagPermission: false,
};

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  groupId,
  actions,
  refresh,
  onUploadSuccess,
  targetTagId,
  isTrashView = false,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const openInWorkspace = useOpenInWorkspace(groupId);
  const noteService = useNoteService();
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [uploadMountTagId, setUploadMountTagId] = useState<string>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagPermissionOpen, setTagPermissionOpen] = useState(false);
  const [tagPermissionTagId, setTagPermissionTagId] = useState<string>();
  const [tagPermissionRefreshToken, setTagPermissionRefreshToken] = useState(0);
  const [resourcePermissionTarget, setResourcePermissionTarget] =
    useState<ResourcePermissionModalTarget | null>(null);
  const [resourcePermissionRefreshToken, setResourcePermissionRefreshToken] = useState(0);
  const [drawioModalOpen, setDrawioModalOpen] = useState(false);
  const [drawioName, setDrawioName] = useState('未命名图表');

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
      await mountResourceToFolderTag({
        resourceId,
        targetTagId: mountTagId,
        documentService,
        resourceService,
        groupId,
      });
    },
    [documentService, groupId, mountTagId, resourceService]
  );

  const handleUploadSuccess = useCallback(() => {
    refresh();
    onUploadSuccess?.();
  }, [onUploadSuccess, refresh]);

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
          resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async () => {
      const title = drawioName.trim() || '未命名图表';
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (resourceId) => {
        setDrawioModalOpen(false);
        refresh();
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.DRAWIO,
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const ModalHost = useMemo(
    () => (
      <>
        {newFolderOpen ? (
          <NewFolderNodeModal
            isOpen={newFolderOpen}
            parentId={currentNodeId}
            groupId={groupId}
            existingFolderNames={existingFolderNames}
            onOpenChange={setNewFolderOpen}
            onSuccess={refresh}
          />
        ) : null}
        <UploadDocumentModal
          isOpen={uploadDocumentOpen}
          targetTagId={uploadMountTagId ?? targetTagId}
          groupId={groupId}
          onOpenChange={(open) => {
            setUploadDocumentOpen(open);
            if (!open) {
              setUploadMountTagId(undefined);
            }
          }}
          onSuccess={handleUploadSuccess}
        />
        {groupId && uploadOpen ? (
          <UploadFileToGroupModal
            isOpen={uploadOpen}
            groupId={groupId}
            onOpenChange={setUploadOpen}
            onSuccess={refresh}
          />
        ) : null}
        {groupId && tagPermissionOpen ? (
          <TagPermissionModal
            isOpen={tagPermissionOpen}
            groupId={groupId}
            initialTagId={tagPermissionTagId}
            onOpenChange={(open) => {
              if (!open) {
                setTagPermissionOpen(false);
                setTagPermissionTagId(undefined);
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
        <AppFormDialog
          isOpen={drawioModalOpen}
          onOpenChange={setDrawioModalOpen}
          title="新建图表"
          confirmText="创建"
          onSubmit={() => runCreateDrawio()}
          isSubmitting={creatingDrawio}
          isSubmitDisabled={creatingDrawio || !drawioName.trim()}
          isDismissable={!creatingDrawio}
        >
          <TextField aria-label="图表名称" value={drawioName} onChange={setDrawioName}>
            <Input placeholder="请输入名称" autoFocus />
          </TextField>
        </AppFormDialog>
      </>
    ),
    [
      creatingDrawio,
      currentNodeId,
      drawioModalOpen,
      drawioName,
      existingFolderNames,
      groupId,
      handleUploadSuccess,
      newFolderOpen,
      refresh,
      resourcePermissionTarget,
      runCreateDrawio,
      targetTagId,
      tagPermissionOpen,
      tagPermissionTagId,
      uploadDocumentOpen,
      uploadMountTagId,
      uploadOpen,
    ]
  );

  const openNewFolder = useCallback(() => {
    setNewFolderOpen(true);
  }, []);

  const openUploadDocument = useCallback(() => {
    const nextMountTagId = resolveCurrentFolderTagId(currentNodeId, []) ?? targetTagId;
    if (nextMountTagId) {
      setUploadMountTagId(nextMountTagId);
    }
    setUploadDocumentOpen(true);
  }, [currentNodeId, targetTagId]);

  const openUploadToGroup = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const openTagPermission = useCallback((tagId?: string) => {
    setTagPermissionTagId(tagId);
    setTagPermissionOpen(true);
  }, []);

  const openResourcePermission = useCallback((target: ResourcePermissionModalTarget) => {
    setResourcePermissionTarget(target);
  }, []);

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId) {
      openInWorkspace({
        resourceId: pendingNewNoteId,
        resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
      });
      return;
    }
    runCreateNote();
  }, [creatingNote, openInWorkspace, runCreateNote]);

  const handleOpenDrawioModal = useCallback(() => {
    if (creatingDrawio) return;
    setDrawioName('未命名图表');
    setDrawioModalOpen(true);
  }, [creatingDrawio]);

  const handleCreateMenuSelect = useCallback(
    (id: CreateMenuItem['id']) => {
      switch (id) {
        case 'folder':
          openNewFolder();
          break;
        case 'note':
          handleCreateNote();
          break;
        case 'drawio':
          handleOpenDrawioModal();
          break;
        case 'upload':
          openUploadDocument();
          break;
      }
    },
    [handleCreateNote, handleOpenDrawioModal, openNewFolder, openUploadDocument]
  );

  const showUploadDocument = Boolean(
    toolbarConfig.canUploadDocument && targetTagId && !isTrashView
  );

  const canCreateInCurrentFolder = Boolean(mountTagId);

  const showCreateMenu = Boolean(
    !isTrashView &&
    (toolbarConfig.canCreateFolder ||
      (canCreateInCurrentFolder &&
        (toolbarConfig.canCreateNote || toolbarConfig.canCreateDrawio || showUploadDocument)))
  );

  const createMenuItems = useMemo<CreateMenuItem[]>(() => {
    if (!showCreateMenu) return [];
    const items: CreateMenuItem[] = [];
    if (toolbarConfig.canCreateFolder) {
      items.push({ id: 'folder', label: '新建文件夹' });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateDrawio) {
      items.push({ id: 'drawio', label: '新建图表', disabled: creatingDrawio });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateNote) {
      items.push({ id: 'note', label: '新建笔记', disabled: creatingNote });
    }
    if (showUploadDocument) {
      items.push({ id: 'upload', label: '上传文件' });
    }
    return items;
  }, [
    canCreateInCurrentFolder,
    creatingDrawio,
    creatingNote,
    showCreateMenu,
    showUploadDocument,
    toolbarConfig.canCreateDrawio,
    toolbarConfig.canCreateFolder,
    toolbarConfig.canCreateNote,
  ]);

  return {
    showCreateMenu,
    showUploadToGroup: Boolean(toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagPermission,
    openResourcePermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    ModalHost,
  };
}

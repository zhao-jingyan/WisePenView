import {
  NewFolderNodeModal,
  TagPermissionModal,
  UploadDocumentModal,
  UploadFileToGroupModal,
} from '@/components/Drive/Modals';
import { Modal } from '@/components/Overlay';
import { useDocumentService, useNoteService, useResourceService } from '@/domains';
import { useNewNoteStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import {
  buildWorkspaceResourcePath,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { Button, Input, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
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
  openTagPermission: () => void;
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
  const navigate = useNavigate();
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
        navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.NOTE, resourceId));
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
        navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.DRAWIO, resourceId));
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
            onSuccess={refresh}
          />
        ) : null}
        <Modal isOpen={drawioModalOpen} onOpenChange={setDrawioModalOpen}>
          <Modal.Backdrop isDismissable={!creatingDrawio}>
            <Modal.Container size="sm" placement="center">
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>新建图表</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <TextField aria-label="图表名称" value={drawioName} onChange={setDrawioName}>
                    <Input
                      placeholder="请输入名称"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          if (!creatingDrawio && drawioName.trim()) {
                            runCreateDrawio();
                          }
                        }
                      }}
                    />
                  </TextField>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onPress={() => setDrawioModalOpen(false)}
                    isDisabled={creatingDrawio}
                  >
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => runCreateDrawio()}
                    isDisabled={creatingDrawio || !drawioName.trim()}
                  >
                    创建
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
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

  const openTagPermission = useCallback(() => {
    setTagPermissionTagId(undefined);
    setTagPermissionOpen(true);
  }, []);

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId) {
      navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.NOTE, pendingNewNoteId));
      return;
    }
    runCreateNote();
  }, [creatingNote, navigate, runCreateNote]);

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
    ModalHost,
  };
}

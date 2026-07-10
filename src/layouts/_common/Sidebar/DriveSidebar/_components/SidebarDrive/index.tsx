import {
  buildDriveTreeData,
  replaceDriveTreeNodeChildren,
} from '@/components/Drive/common/buildDriveTreeData';
import {
  getDriveNodeLabel,
  getDriveScopeGroupId,
  mountResourceToFolderTag,
  resolveDriveScope,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import { useDriveTreeChildren } from '@/components/Drive/common/useDriveTreeChildren';
import {
  DeleteNodeModal,
  NewFolderNodeModal,
  RenameNodeModal,
  UploadDocumentModal,
} from '@/components/Drive/Modals';
import { Empty, Spin } from '@/components/Feedback';
import { FormField, Input } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import CreateSkillModal from '@/components/Skill/CreateSkillModal';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDocumentService, useDriveService, useNoteService, useResourceService } from '@/domains';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useActiveDriveScopeStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useRef, useState } from 'react';

import type { SidebarDriveCreateAction } from './SidebarDriveNodeTitle';
import SidebarDriveNodeTitle from './SidebarDriveNodeTitle';
import SidebarDriveScopeSwitcher from './SidebarDriveScopeSwitcher';
import styles from './style.module.less';

const RENDERABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>([
  'root',
  'folder',
  'resource',
  'link',
]);
const SELECTABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>(['resource', 'link']);
const EMPTY_DISABLED_IDS = new Set<string>();

function SidebarDrive() {
  const driveService = useDriveService();
  const documentService = useDocumentService();
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const groupId = useActiveDriveScopeStore((state) => state.groupId);
  const resolvedScope = useMemo(
    () => resolveDriveScope(groupId ? { type: 'group', groupId } : undefined),
    [groupId]
  );
  const openInWorkspace = useOpenInWorkspace(groupId);

  const { childrenMap, loadChildren, reset } = useDriveTreeChildren({
    groupId: resolvedScope.groupId,
    scope: resolvedScope.scope,
  });
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [createFolderParent, setCreateFolderParent] = useState<RootNode | FolderNode | null>(null);
  const [noteTarget, setNoteTarget] = useState<RootNode | FolderNode | null>(null);
  const [uploadTarget, setUploadTarget] = useState<RootNode | FolderNode | null>(null);
  const [drawioTarget, setDrawioTarget] = useState<RootNode | FolderNode | null>(null);
  const [drawioName, setDrawioName] = useState('未命名图表');
  const [drawioNameError, setDrawioNameError] = useState('');
  const [skillTarget, setSkillTarget] = useState<RootNode | FolderNode | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);

  const existingFolderNames = useMemo(() => {
    if (!createFolderParent) return [];
    return (childrenMap.get(createFolderParent.id) ?? [])
      .filter((node): node is FolderNode => node.type === 'folder')
      .map((node) => node.name);
  }, [childrenMap, createFolderParent]);

  const handleSelectScope = (): void => {
    setSelectedKeys([]);
    setExpandedKeys([]);
  };

  const resolveContainerMountTagId = (node: RootNode | FolderNode): string | undefined => {
    if (node.type === 'folder') return node.tagId;
    return node.canMountResources ? node.tagId : undefined;
  };

  const mountCreatedResource = async (
    resourceId: string,
    target: RootNode | FolderNode
  ): Promise<void> => {
    const targetTagId = resolveContainerMountTagId(target);
    if (!targetTagId) return;

    const targetGroupId = getDriveScopeGroupId(target.scope);
    if (targetGroupId) {
      const sharedTagId = await driveService.ensureSharedFolder();
      await mountResourceToFolderTag({
        resourceId,
        targetTagId: sharedTagId,
        documentService,
        resourceService,
      });
      await resourceService.mountResourcesToGroupTag({
        resourceIds: [resourceId],
        groupId: targetGroupId,
        tagId: targetTagId,
      });
      return;
    }

    await mountResourceToFolderTag({
      resourceId,
      targetTagId,
      documentService,
      resourceService,
    });
  };

  const handleCreateNode = (
    node: RootNode | FolderNode,
    action: SidebarDriveCreateAction
  ): void => {
    switch (action) {
      case 'folder':
        setCreateFolderParent(node);
        break;
      case 'note':
        setNoteTarget(node);
        break;
      case 'drawio':
        setDrawioTarget(node);
        setDrawioName('未命名图表');
        setDrawioNameError('');
        break;
      case 'skill':
        setSkillTarget(node);
        break;
      case 'upload':
        setUploadTarget(node);
        break;
    }
  };

  function buildChildrenData(nodes: DriveNode[]): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_DISABLED_IDS,
        getTreeKey: (node) => node.id,
        renderTitle: (node) => (
          <SidebarDriveNodeTitle
            node={node}
            scopeSwitcher={
              node.type === 'root' ? (
                <SidebarDriveScopeSwitcher onSelectScope={handleSelectScope} />
              ) : undefined
            }
            onCreateNode={handleCreateNode}
            onRenameNode={setRenameTarget}
            onDeleteNode={setDeleteTarget}
          />
        ),
      },
      nodeMapRef.current
    );
  }

  const { loading: treeLoading, refresh: refreshTree } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      reset();
      setSelectedKeys([]);
      setExpandedKeys([]);
      const rootNode = await driveService.getRootNode({
        rootId: resolvedScope.rootId,
        groupId: resolvedScope.groupId,
      });
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      const fixedRoot = { ...baseRoot, children: undefined, isLeaf: true };
      if (rootNode.type !== 'root') return [fixedRoot];
      const children = await loadChildren(rootNode.id);
      const childData = buildChildrenData(children);
      return [fixedRoot, ...childData];
    },
    {
      refreshDeps: [resolvedScope.rootId, resolvedScope.groupId],
      onSuccess: (data) => {
        setTreeData(data);
        setExpandedKeys([]);
      },
    }
  );

  useRequest(
    async () => {
      if (!noteTarget) {
        throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
      }
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId, noteTarget);
      return {
        resourceId,
        groupId: getDriveScopeGroupId(noteTarget.scope),
      };
    },
    {
      ready: Boolean(noteTarget),
      refreshDeps: [noteTarget],
      onSuccess: ({ resourceId, groupId: resourceGroupId }) => {
        setNoteTarget(null);
        refreshTree();
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
          groupId: resourceGroupId,
        });
      },
      onError: (err) => {
        setNoteTarget(null);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async (target: RootNode | FolderNode, title: string) => {
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId, target);
      return {
        resourceId,
        groupId: getDriveScopeGroupId(target.scope),
      };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, groupId: resourceGroupId }) => {
        setDrawioTarget(null);
        setDrawioNameError('');
        refreshTree();
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.DRAWIO,
          groupId: resourceGroupId,
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSkillSuccess = (resourceId: string): void => {
    const target = skillTarget;
    if (!target) return;

    void (async () => {
      try {
        await mountCreatedResource(resourceId, target);
        setSkillTarget(null);
        refreshTree();
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.SKILL,
          groupId: getDriveScopeGroupId(target.scope),
        });
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
    })();
  };

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    const children = await loadChildren(node.id);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceDriveTreeNodeChildren(prev, node.id, childData));
  };

  const handleSelect = (_keys: React.Key[], info: { node: DataNode }): void => {
    const key = String(info.node.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'resource' && node.type !== 'link')) return;
    setSelectedKeys([key]);
    if (!node.resourceId) return;
    openInWorkspace({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
    });
  };

  const handleExpand = (nextKeys: React.Key[]): void => {
    setExpandedKeys(nextKeys);
  };

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;

  return (
    <div className={styles.sidebar}>
      {showSpin ? (
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      ) : showEmpty ? (
        <div className={styles.stateBlock}>
          <Empty description="暂无内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          selectable
          expandAction="click"
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          loadData={handleLoadData}
        />
      )}
      {createFolderParent ? (
        <NewFolderNodeModal
          isOpen={Boolean(createFolderParent)}
          parentId={createFolderParent.id}
          groupId={resolvedScope.groupId}
          parentLabel={getDriveNodeLabel(createFolderParent)}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setCreateFolderParent(null);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      {uploadTarget ? (
        <UploadDocumentModal
          isOpen={Boolean(uploadTarget)}
          targetTagId={resolveContainerMountTagId(uploadTarget)}
          groupId={getDriveScopeGroupId(uploadTarget.scope)}
          onOpenChange={(open) => {
            if (!open) setUploadTarget(null);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      <AppFormDialog
        isOpen={Boolean(drawioTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawioTarget(null);
            setDrawioNameError('');
          }
        }}
        title="新建图表"
        confirmText="创建"
        onSubmit={() => {
          const title = drawioName.trim();
          if (!drawioTarget || !title) {
            setDrawioNameError('请输入图表名称');
            return;
          }
          runCreateDrawio(drawioTarget, title);
        }}
        isSubmitting={creatingDrawio}
        isSubmitDisabled={creatingDrawio}
        isDismissable={!creatingDrawio}
      >
        <FormField
          aria-label="图表名称"
          label="图表名称"
          name="sidebarDrawioName"
          value={drawioName}
          onChange={(value) => {
            setDrawioName(value);
            setDrawioNameError('');
          }}
          errorMessage={drawioNameError}
          isRequired
        >
          <Input placeholder="请输入名称" autoFocus />
        </FormField>
      </AppFormDialog>
      <CreateSkillModal
        isOpen={Boolean(skillTarget)}
        onOpenChange={(open) => {
          if (!open) setSkillTarget(null);
        }}
        onSuccess={handleCreateSkillSuccess}
      />
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        groupId={resolvedScope.groupId}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshTree}
      />
      <DeleteNodeModal
        isOpen={Boolean(deleteTarget)}
        node={deleteTarget}
        groupId={resolvedScope.groupId}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={refreshTree}
      />
    </div>
  );
}

export default SidebarDrive;

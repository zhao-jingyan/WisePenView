import { Empty, ResultState, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import SkillEditor from '@/components/Skill/SkillEditor';
import SkillFileTree from '@/components/Skill/SkillFileTree';
import type {
  SkillFileDropPosition,
  SkillPendingCreate,
} from '@/components/Skill/SkillFileTree/index.type';
import SkillVersionDropdown from '@/components/Skill/SkillVersionDropdown';
import { useResourceService, useSkillService } from '@/domains';
import type { SkillFileNode } from '@/domains/Skill';
import { SkillServicesMap } from '@/domains/Skill';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FolderPlus, Pencil, Plus, Save, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import ResourcePermissionControl from '../_components/ResourcePermissionControl';

import CreateSkillModal from './_components/CreateSkillModal';
import UnsavedSkillChangesModal from './_components/UnsavedSkillChangesModal';
import styles from './style.module.less';

interface SkillViewProps {
  resourceId?: string;
}

interface SkillLayoutConfigProps {
  children: ReactNode;
  config?: WorkspaceLayoutConfig;
}

interface SkillToolbarTitleProps {
  title?: string;
  saveStatus?: SkillSaveStatus;
}

type SkillSaveStatus = 'saved' | 'dirty' | 'saving';

interface SaveAssetOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface MoveTreeNodeResult {
  files: SkillFileNode[];
  idMap: Map<string, string>;
  movedFiles: Array<{
    previous: SkillFileNode;
    next: SkillFileNode;
  }>;
}

const ROOT_PATH = '/';
const MAIN_SKILL_FILE_NAME = 'SKILL.md';
const ACCEPTED_SKILL_FILE_EXTENSIONS = new Set(['md', 'py', 'txt', 'json', 'yaml', 'yml', 'toml']);

function findFile(nodes: SkillFileNode[], id: string): SkillFileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findFile(node.children, id) : null;
    if (child) return child;
  }
  return null;
}

function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function joinDirectoryPath(parentPath: string, name: string): string {
  const normalizedParent = normalizeDirectoryPath(parentPath);
  return normalizedParent === ROOT_PATH ? `${ROOT_PATH}${name}` : `${normalizedParent}/${name}`;
}

function getParentDirectoryPath(path: string): string {
  const normalizedPath = normalizeDirectoryPath(path);
  if (normalizedPath === ROOT_PATH) return ROOT_PATH;
  const lastSlashIndex = normalizedPath.lastIndexOf(ROOT_PATH);
  return lastSlashIndex <= 0 ? ROOT_PATH : normalizedPath.slice(0, lastSlashIndex);
}

function getFirstFile(nodes: SkillFileNode[]): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file') return node;
    const child = node.children ? getFirstFile(node.children) : null;
    if (child) return child;
  }
  return null;
}

function collectExpandedKeys(nodes: SkillFileNode[]): string[] {
  const keys: string[] = [];
  function walk(items: SkillFileNode[]) {
    for (const item of items) {
      if (item.kind === 'folder') keys.push(item.id);
      if (item.children) walk(item.children);
    }
  }
  walk(nodes);
  return keys;
}

function collectFileIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  if (node.kind === 'file') return [node.id];
  return (node.children ?? []).flatMap(collectFileIds);
}

function findRootMainSkillFile(nodes: SkillFileNode[]): SkillFileNode | null {
  return (
    nodes.find(
      (node) =>
        node.kind === 'file' &&
        node.name === MAIN_SKILL_FILE_NAME &&
        normalizeDirectoryPath(node.path) === ROOT_PATH
    ) ?? null
  );
}

function findSkillFileByName(
  nodes: SkillFileNode[],
  predicate: (name: string) => boolean
): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file' && predicate(node.name)) return node;
    const child = node.children ? findSkillFileByName(node.children, predicate) : null;
    if (child) return child;
  }
  return null;
}

function collectNodeIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  return [node.id, ...(node.children ?? []).flatMap(collectNodeIds)];
}

function isPersistedAssetId(id: string): boolean {
  return Boolean(
    id &&
    !id.startsWith('local-file:') &&
    !id.startsWith('folder:') &&
    !id.includes(ROOT_PATH) &&
    !id.includes(':')
  );
}

function isAcceptedSkillFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return Boolean(ext && ACCEPTED_SKILL_FILE_EXTENSIONS.has(ext));
}

function removeTreeNode(nodes: SkillFileNode[], idSet: Set<string>): SkillFileNode[] {
  return nodes
    .filter((node) => !idSet.has(node.id))
    .map((node) =>
      node.children ? { ...node, children: removeTreeNode(node.children, idSet) } : node
    );
}

function updateTreeFileContent(
  nodes: SkillFileNode[],
  id: string,
  content: string,
  nextId?: string
): SkillFileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, id: nextId ?? node.id, content };
    if (node.children) {
      return { ...node, children: updateTreeFileContent(node.children, id, content, nextId) };
    }
    return node;
  });
}

function remapTreeNodeIds(nodes: SkillFileNode[], idMap: Map<string, string>): SkillFileNode[] {
  if (idMap.size === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) ?? node.id,
    children: node.children ? remapTreeNodeIds(node.children, idMap) : undefined,
  }));
}

function appendTreeNode(
  nodes: SkillFileNode[],
  parentFolderId: string | undefined,
  childNode: SkillFileNode
): SkillFileNode[] {
  if (!parentFolderId) return [...nodes, childNode];

  return nodes.map((node) => {
    if (node.id === parentFolderId && node.kind === 'folder') {
      return { ...node, children: [...(node.children ?? []), childNode] };
    }
    if (node.children) {
      return { ...node, children: appendTreeNode(node.children, parentFolderId, childNode) };
    }
    return node;
  });
}

function removeTreeNodeWithResult(
  nodes: SkillFileNode[],
  id: string
): { nodes: SkillFileNode[]; removed: SkillFileNode | null } {
  let removed: SkillFileNode | null = null;
  const nextNodes: SkillFileNode[] = [];

  for (const node of nodes) {
    if (node.id === id) {
      removed = node;
      continue;
    }

    if (node.children) {
      const childResult = removeTreeNodeWithResult(node.children, id);
      if (childResult.removed) {
        removed = childResult.removed;
        nextNodes.push({ ...node, children: childResult.nodes });
        continue;
      }
    }

    nextNodes.push(node);
  }

  return { nodes: nextNodes, removed };
}

function insertTreeNodeByDrop(
  nodes: SkillFileNode[],
  dropId: string,
  dropPosition: SkillFileDropPosition,
  movedNode: SkillFileNode
): SkillFileNode[] {
  const nextNodes: SkillFileNode[] = [];

  for (const node of nodes) {
    if (node.id === dropId && dropPosition !== 'inside') {
      if (dropPosition === 'before') nextNodes.push(movedNode);
      nextNodes.push(node);
      if (dropPosition === 'after') nextNodes.push(movedNode);
      continue;
    }

    if (node.id === dropId && dropPosition === 'inside' && node.kind === 'folder') {
      nextNodes.push({ ...node, children: [...(node.children ?? []), movedNode] });
      continue;
    }

    if (node.children) {
      nextNodes.push({
        ...node,
        children: insertTreeNodeByDrop(node.children, dropId, dropPosition, movedNode),
      });
      continue;
    }

    nextNodes.push(node);
  }

  return nextNodes;
}

function updateMovedNodePaths(
  node: SkillFileNode,
  parentPath: string,
  idMap: Map<string, string>,
  movedFiles: MoveTreeNodeResult['movedFiles']
): SkillFileNode {
  const normalizedParentPath = normalizeDirectoryPath(parentPath);

  if (node.kind === 'file') {
    const nextNode = { ...node, path: normalizedParentPath };
    movedFiles.push({ previous: node, next: nextNode });
    return nextNode;
  }

  const nextPath = joinDirectoryPath(normalizedParentPath, node.name);
  const nextId = `folder:${nextPath}`;
  if (node.id !== nextId) idMap.set(node.id, nextId);

  return {
    ...node,
    id: nextId,
    path: nextPath,
    children: (node.children ?? []).map((child) =>
      updateMovedNodePaths(child, nextPath, idMap, movedFiles)
    ),
  };
}

function resolveMoveParentPath(
  dropNode: SkillFileNode,
  dropPosition: SkillFileDropPosition
): string {
  if (dropPosition === 'inside' && dropNode.kind === 'folder') {
    return normalizeDirectoryPath(dropNode.path);
  }
  if (dropNode.kind === 'file') return normalizeDirectoryPath(dropNode.path);
  return getParentDirectoryPath(dropNode.path);
}

function getDirectChildren(nodes: SkillFileNode[], parentPath: string): SkillFileNode[] {
  const normalizedParentPath = normalizeDirectoryPath(parentPath);
  const result: SkillFileNode[] = [];

  function walk(items: SkillFileNode[]) {
    for (const item of items) {
      const itemParentPath =
        item.kind === 'file'
          ? normalizeDirectoryPath(item.path)
          : getParentDirectoryPath(item.path);
      if (itemParentPath === normalizedParentPath) result.push(item);
      if (item.children) walk(item.children);
    }
  }

  walk(nodes);
  return result;
}

function hasMoveNameConflict(
  nodes: SkillFileNode[],
  movingNode: SkillFileNode,
  targetParentPath: string
): boolean {
  const movingIdSet = new Set(collectNodeIds(movingNode));
  return getDirectChildren(nodes, targetParentPath).some(
    (node) => node.name === movingNode.name && !movingIdSet.has(node.id)
  );
}

function moveTreeNode(
  nodes: SkillFileNode[],
  dragId: string,
  dropId: string,
  dropPosition: SkillFileDropPosition
): MoveTreeNodeResult | null {
  if (dragId === dropId) return null;

  const dragNode = findFile(nodes, dragId);
  const dropNode = findFile(nodes, dropId);
  if (!dragNode || !dropNode) return null;
  if (collectNodeIds(dragNode).includes(dropId)) return null;

  const targetParentPath = resolveMoveParentPath(dropNode, dropPosition);
  if (hasMoveNameConflict(nodes, dragNode, targetParentPath)) return null;

  const removeResult = removeTreeNodeWithResult(nodes, dragId);
  if (!removeResult.removed) return null;

  const idMap = new Map<string, string>();
  const movedFiles: MoveTreeNodeResult['movedFiles'] = [];
  const movedNode = updateMovedNodePaths(removeResult.removed, targetParentPath, idMap, movedFiles);

  return {
    files: insertTreeNodeByDrop(removeResult.nodes, dropId, dropPosition, movedNode),
    idMap,
    movedFiles,
  };
}

function createLocalFileNode(name: string, path = ROOT_PATH): SkillFileNode {
  const normalizedPath = normalizeDirectoryPath(path);

  return {
    id: `local-file:${Date.now()}:${normalizedPath}:${name}`,
    name,
    path: normalizedPath,
    kind: 'file',
    language: name.endsWith('.py') ? 'python' : 'markdown',
    content: '',
  };
}

function createLocalFolderNode(name: string, parentPath = ROOT_PATH): SkillFileNode {
  const path = joinDirectoryPath(parentPath, name);

  return {
    id: `folder:${path}`,
    name,
    path,
    kind: 'folder',
    children: [],
  };
}

function SkillLayoutConfig({ children, config }: SkillLayoutConfigProps) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      ...(config ?? {}),
    }),
    [config]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function formatSaveStatus(status?: SkillSaveStatus): string | null {
  if (status === 'dirty') return '有未保存修改';
  if (status === 'saving') return '保存中...';
  if (status === 'saved') return '已经保存到云端';
  return null;
}

function SkillToolbarTitle({ title, saveStatus }: SkillToolbarTitleProps) {
  const saveStatusText = formatSaveStatus(saveStatus);

  return (
    <span className={styles.toolbarTitleText}>
      <span className={styles.toolbarTitleIcon} aria-hidden="true">
        <EntryIcon entryType="resource" resourceIconType="skill" size={18} />
      </span>
      <span className={styles.toolbarTitleContent}>
        <span className={styles.toolbarTitleName}>{title || '未命名 Skill'}</span>
        {saveStatusText ? (
          <span
            className={`${styles.toolbarSaveStatus} ${
              saveStatus === 'dirty' ? styles.toolbarSaveStatusDirty : ''
            }`}
          >
            {saveStatusText}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function SkillView({ resourceId = '' }: SkillViewProps = {}) {
  const navigate = useNavigate();
  const openInWorkspace = useOpenInWorkspace();
  const skillService = useSkillService();
  const resourceService = useResourceService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFiles, setLocalFiles] = useState<SkillFileNode[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState('');
  const [editing, setEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [pendingCreate, setPendingCreate] = useState<SkillPendingCreate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillFileNode | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(!resourceId);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [pendingFileSwitchId, setPendingFileSwitchId] = useState('');
  const [isTreeDragOver, setIsTreeDragOver] = useState(false);

  const {
    data: skill,
    loading,
    error,
    refresh: refreshSkill,
  } = useRequest(() => skillService.getSkillDetail(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  useRequest(() => resourceService.interactRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  /**
   * skill 详情刷新后重置本地文件树；文件树是用户编辑草稿的临时视图，不能只靠渲染派生。
   */
  useEffectForce(() => {
    if (!skill) return;
    setLocalFiles(skill.files);
    setViewingVersion(skill.draftVersion);
    setPendingCreate(null);
    setSelectedTreeNodeId('');
    setEditing(false);
  }, [skill]);

  const activeFiles = localFiles;
  const selectedFile = useMemo(() => {
    if (selectedFileId) return findFile(activeFiles, selectedFileId);
    return getFirstFile(activeFiles);
  }, [activeFiles, selectedFileId]);
  const selectedTreeNode = useMemo(
    () => (selectedTreeNodeId ? findFile(activeFiles, selectedTreeNodeId) : null),
    [activeFiles, selectedTreeNodeId]
  );

  /**
   * 文件树或选中文件变化时同步 Monaco 内容；这是第三方编辑器受控值的边界同步。
   */
  useEffectForce(() => {
    const content = selectedFile?.content ?? '';
    if (selectedFileId && !selectedFile) setSelectedFileId('');
    setEditorContent(content);
    setSavedContent(content);
  }, [selectedFile, selectedFileId]);

  /**
   * 进入无 resourceId 的兼容路由时自动打开创建弹窗；关闭时回到云盘。
   */
  useEffectForce(() => {
    if (!resourceId) setCreateModalOpen(true);
  }, [resourceId]);

  const expandedKeys = useMemo(() => collectExpandedKeys(activeFiles), [activeFiles]);
  const isViewingDraft = skill ? viewingVersion === skill.draftVersion : false;
  const canEdit = Boolean(skill?.isOwner && isViewingDraft);
  const isDirty = canEdit && editorContent !== savedContent;
  const navigationBlocker = useBlocker(isDirty);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [isDirty]
    ),
    { capture: true }
  );

  const versionItems = useMemo(() => {
    if (!skill) return [];
    const items = [
      {
        key: `v${skill.draftVersion}`,
        version: skill.draftVersion,
        current: viewingVersion === skill.draftVersion,
      },
    ];
    for (let version = skill.version; version >= 1; version -= 1) {
      items.push({
        key: `v${version}`,
        version,
        current: viewingVersion === version,
      });
    }
    return items;
  }, [skill, viewingVersion]);

  const disabledVersionKeys = useMemo(
    () => (skill?.isOwner ? new Set<string>() : new Set(versionItems.map((item) => item.key))),
    [skill?.isOwner, versionItems]
  );

  const handleCreateSuccess = (newResourceId: string) => {
    setCreateModalOpen(false);
    openInWorkspace({
      resourceId: newResourceId,
      resourceType: WORKSPACE_RESOURCE_TYPE.SKILL,
      replace: true,
    });
  };

  const resolveCreateParent = useCallback(() => {
    const node = selectedTreeNode ?? (selectedFileId ? selectedFile : null);
    if (!node) {
      return { parentFolderId: undefined, parentPath: ROOT_PATH };
    }
    if (node.kind === 'folder') {
      return { parentFolderId: node.id, parentPath: normalizeDirectoryPath(node.path) };
    }

    const filePath = normalizeDirectoryPath(node.path);
    return {
      parentFolderId: filePath === ROOT_PATH ? undefined : `folder:${filePath}`,
      parentPath: filePath,
    };
  }, [selectedFile, selectedFileId, selectedTreeNode]);

  const applyTreeSelection = useCallback(
    (nodeId: string) => {
      const node = findFile(activeFiles, nodeId);
      if (!node) return;
      setSelectedTreeNodeId(nodeId);
      if (node.kind === 'file') {
        setSelectedFileId(nodeId);
      }
    },
    [activeFiles]
  );

  const handleTreeSelect = (nodeId: string) => {
    const node = findFile(activeFiles, nodeId);
    if (!node) return;
    if (node.kind === 'file' && node.id !== selectedFileId && isDirty) {
      setPendingFileSwitchId(node.id);
      return;
    }
    applyTreeSelection(nodeId);
  };

  const handleStartCreate = (kind: 'file' | 'folder') => {
    const { parentFolderId } = resolveCreateParent();
    setPendingCreate({ kind, parentFolderId });
  };

  const {
    loading: saveLoading,
    run: runSave,
    runAsync: runSaveAsync,
  } = useRequest(
    async (file: SkillFileNode, content: string, options?: SaveAssetOptions) => {
      if (!skill) return;
      const assetId = await skillService.saveAsset(skill.resourceId, skill.draftVersion, {
        name: file.name,
        path: file.path,
        content,
      });
      return { file, content, options, assetId };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setLocalFiles((prev) =>
          updateTreeFileContent(prev, result.file.id, result.content, result.assetId)
        );
        const assetId = result.assetId;
        if (assetId) {
          setSelectedFileId((prev) => (prev === result.file.id ? assetId : prev));
          setSelectedTreeNodeId((prev) => (prev === result.file.id ? assetId : prev));
          setPendingFileSwitchId((prev) => (prev === result.file.id ? assetId : prev));
        }
        setSavedContent(result.content);
        setEditing(false);
        if (result.options?.showToast !== false) {
          toast.success('保存成功');
        }
        if (result.options?.refresh === true) {
          void refreshSkill();
        }
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: publishLoading, run: runPublish } = useRequest(
    async () => {
      if (!skill) return;
      await skillService.publishVersion(skill.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('发布成功');
        void refreshSkill();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: versionLoading, run: runSwitchVersion } = useRequest(
    async (version: number) => {
      if (!skill) return null;
      return skillService.getSkillVersionFiles(skill.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (!data) return;
        setViewingVersion(params[0]);
        setLocalFiles(data.files);
        setEditing(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: deleteLoading, run: runDelete } = useRequest(
    async (target: SkillFileNode) => {
      if (!skill) return null;
      const ids = collectFileIds(target);
      const persistedIds = ids.filter(isPersistedAssetId);
      if (persistedIds.length > 0) {
        await skillService.deleteAssets(skill.resourceId, skill.draftVersion, persistedIds);
      }
      return { target, ids };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        const removeIds = new Set<string>([result.target.id, ...result.ids]);
        setLocalFiles((prev) => removeTreeNode(prev, removeIds));
        if (removeIds.has(selectedFileId)) setSelectedFileId('');
        if (removeIds.has(selectedTreeNodeId)) setSelectedTreeNodeId('');
        setDeleteTarget(null);
        toast.success('删除成功');
        void refreshSkill();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSave = useCallback(() => {
    if (!selectedFile || !canEdit) return;
    runSave(selectedFile, editorContent);
  }, [canEdit, editorContent, runSave, selectedFile]);

  const saveCurrentFile = useCallback(
    async (options?: SaveAssetOptions) => {
      if (!selectedFile || !canEdit) return;
      await runSaveAsync(selectedFile, editorContent, options);
    },
    [canEdit, editorContent, runSaveAsync, selectedFile]
  );

  const handlePublish = useCallback(() => {
    const mainSkillFile = findRootMainSkillFile(activeFiles);
    if (!mainSkillFile) {
      toast.warning('发布前需要在根目录下创建并保存大写的 SKILL.md');
      return;
    }
    if (
      mainSkillFile.id.startsWith('local-file:') &&
      !(mainSkillFile.id === selectedFileId && isDirty)
    ) {
      toast.warning('发布前需要先保存根目录下的 SKILL.md');
      return;
    }
    if (isDirty) {
      setPublishConfirmOpen(true);
      return;
    }
    runPublish();
  }, [activeFiles, isDirty, runPublish, selectedFileId]);

  const handleSaveAndPublish = async () => {
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      setPublishConfirmOpen(false);
      runPublish();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndPublish = () => {
    setEditorContent(savedContent);
    setPublishConfirmOpen(false);
    runPublish();
  };

  const handleCancelLeave = () => {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
  };

  const handleDiscardAndLeave = () => {
    if (navigationBlocker.state !== 'blocked') return;
    setEditorContent(savedContent);
    navigationBlocker.proceed();
  };

  const handleSaveAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked') return;
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      navigationBlocker.proceed();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleCancelFileSwitch = () => {
    setPendingFileSwitchId('');
  };

  const handleDiscardAndSwitchFile = () => {
    const nextFileId = pendingFileSwitchId;
    setPendingFileSwitchId('');
    setEditorContent(savedContent);
    if (nextFileId) applyTreeSelection(nextFileId);
    setEditing(false);
  };

  const handleSaveAndSwitchFile = async () => {
    const nextFileId = pendingFileSwitchId;
    if (!nextFileId) return;
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      setPendingFileSwitchId('');
      applyTreeSelection(nextFileId);
      setEditing(false);
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleToggleEditing = useCallback(() => {
    if (editing) {
      setEditorContent(savedContent);
      setEditing(false);
      return;
    }
    setEditing(true);
  }, [editing, savedContent]);

  const selectNewLocalFile = useCallback(
    (fileId: string) => {
      if (isDirty) {
        setPendingFileSwitchId(fileId);
        return;
      }
      setSelectedFileId(fileId);
      setSelectedTreeNodeId(fileId);
      setEditing(true);
    },
    [isDirty]
  );

  const { loading: moveLoading, run: runMoveFile } = useRequest(
    async ({
      dragId,
      dropId,
      dropPosition,
    }: {
      dragId: string;
      dropId: string;
      dropPosition: SkillFileDropPosition;
    }) => {
      if (!skill || !canEdit) return null;
      if (isDirty) {
        throw new Error('请先保存或放弃当前修改后再移动文件');
      }

      const moveResult = moveTreeNode(activeFiles, dragId, dropId, dropPosition);
      if (!moveResult) {
        throw new Error('无法移动到该位置，目标目录可能已有同名文件或文件夹');
      }

      const idMap = new Map(moveResult.idMap);
      const persistedPathMoves = moveResult.movedFiles.filter(
        ({ previous, next }) => previous.path !== next.path && isPersistedAssetId(previous.id)
      );
      const missingContentFile = persistedPathMoves.find(
        ({ previous }) => typeof previous.content !== 'string'
      );

      if (missingContentFile) {
        throw new Error('该文件内容尚未加载，暂时无法移动；请先重新保存该文件后再移动');
      }

      const previousAssetIds: string[] = [];
      for (const { previous, next } of persistedPathMoves) {
        const assetId = await skillService.saveAsset(skill.resourceId, skill.draftVersion, {
          name: next.name,
          path: next.path,
          content: previous.content ?? '',
        });
        if (assetId) idMap.set(previous.id, assetId);
        previousAssetIds.push(previous.id);
      }

      if (previousAssetIds.length > 0) {
        await skillService.deleteAssets(skill.resourceId, skill.draftVersion, previousAssetIds);
      }

      return { moveResult, idMap };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setLocalFiles(remapTreeNodeIds(result.moveResult.files, result.idMap));
        if (result.idMap.size > 0) {
          setSelectedFileId((prev) => result.idMap.get(prev) ?? prev);
          setSelectedTreeNodeId((prev) => result.idMap.get(prev) ?? prev);
        }
        toast.success('移动成功');
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const canEditTree = canEdit && !moveLoading;

  const handleCommitCreate = (name: string, kind: 'file' | 'folder') => {
    if (!canEdit) {
      setPendingCreate(null);
      return;
    }
    const parentFolder = pendingCreate?.parentFolderId
      ? findFile(activeFiles, pendingCreate.parentFolderId)
      : null;
    const parentPath = parentFolder?.kind === 'folder' ? parentFolder.path : ROOT_PATH;

    if (kind === 'folder') {
      const folder = createLocalFolderNode(name, parentPath);
      setLocalFiles((prev) => appendTreeNode(prev, pendingCreate?.parentFolderId, folder));
      setSelectedTreeNodeId(folder.id);
    } else {
      const file = createLocalFileNode(name, parentPath);
      setLocalFiles((prev) => appendTreeNode(prev, pendingCreate?.parentFolderId, file));
      selectNewLocalFile(file.id);
    }
    setPendingCreate(null);
  };

  const handleAddLocalFiles = async (files: File[]) => {
    if (!canEditTree || files.length === 0) return;

    const acceptedFiles = files.filter(isAcceptedSkillFile);
    if (acceptedFiles.length === 0) {
      toast.warning('仅支持 .md、.py、.txt、.json、.yaml、.yml、.toml 文件');
      return;
    }
    if (acceptedFiles.length < files.length) {
      toast.warning('已跳过不支持的文件类型');
    }

    try {
      const { parentFolderId, parentPath } = resolveCreateParent();
      const nextFiles: SkillFileNode[] = [];

      for (const file of acceptedFiles) {
        const content = await file.text();
        nextFiles.push({
          ...createLocalFileNode(file.name, parentPath),
          content,
          size: file.size,
        });
      }

      setLocalFiles((prev) =>
        nextFiles.reduce((tree, fileNode) => appendTreeNode(tree, parentFolderId, fileNode), prev)
      );
      const lastFile = nextFiles[nextFiles.length - 1];
      if (lastFile) selectNewLocalFile(lastFile.id);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleAddLocalFiles(Array.from(event.target.files ?? []));
    } finally {
      event.target.value = '';
    }
  };

  const handleTreeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canEditTree ? 'copy' : 'none';
    if (canEditTree) setIsTreeDragOver(true);
  };

  const handleTreeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setIsTreeDragOver(false);
    }
  };

  const handleTreeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsTreeDragOver(false);
    if (!canEditTree) return;
    void handleAddLocalFiles(Array.from(event.dataTransfer.files));
  };

  const handleTreeWrapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.wisepen-tree__item')) return;
    if (isDirty) {
      toast.warning('请先保存或放弃当前修改后再取消选择');
      return;
    }
    setSelectedTreeNodeId('');
    setSelectedFileId('');
  };

  const handleCloseCreateModal = (open: boolean) => {
    setCreateModalOpen(open);
    if (!open && !resourceId) {
      navigate('/app/drive', { replace: true });
    }
  };

  const headerConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      header: {
        inlineTitle: (
          <SkillToolbarTitle
            title={skill?.title}
            saveStatus={
              canEdit ? (saveLoading ? 'saving' : isDirty ? 'dirty' : 'saved') : undefined
            }
          />
        ),
        extra: skill ? (
          <div className={styles.topBarActions}>
            <ResourcePermissionControl
              resourceId={skill.resourceId}
              resourceType={WORKSPACE_RESOURCE_TYPE.SKILL}
              ownerId={skill.ownerId}
              onSuccess={refreshSkill}
            />
            {canEdit ? (
              <>
                <Button variant="secondary" onPress={handleToggleEditing} isDisabled={moveLoading}>
                  <Pencil size={16} />
                  <span>{editing ? '取消' : '编辑'}</span>
                </Button>
                {editing ? (
                  <Button
                    variant="secondary"
                    onPress={handleSave}
                    isDisabled={!isDirty || saveLoading || moveLoading}
                  >
                    <Save size={16} />
                    <span>保存</span>
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onPress={handlePublish}
                  isDisabled={publishLoading || saveLoading || moveLoading}
                >
                  <Upload size={16} />
                  <span>发布</span>
                </Button>
              </>
            ) : null}
            <SkillVersionDropdown
              items={versionItems}
              disabledKeys={disabledVersionKeys}
              formatVersion={SkillServicesMap.formatVersion}
              onSelect={(version) => runSwitchVersion(version)}
            />
          </div>
        ) : undefined,
      },
    }),
    [
      canEdit,
      disabledVersionKeys,
      editing,
      handlePublish,
      handleSave,
      handleToggleEditing,
      isDirty,
      moveLoading,
      publishLoading,
      refreshSkill,
      runSwitchVersion,
      saveLoading,
      skill,
      versionItems,
    ]
  );

  if (!resourceId) {
    return (
      <SkillLayoutConfig config={{ header: { inlineTitle: <SkillToolbarTitle title="Skill" /> } }}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="info"
            title="创建 Skill"
            extra={
              <Button variant="primary" onPress={() => setCreateModalOpen(true)}>
                创建新 Skill
              </Button>
            }
          />
        </div>
        <CreateSkillModal
          isOpen={createModalOpen}
          onOpenChange={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      </SkillLayoutConfig>
    );
  }

  if (error) {
    return (
      <SkillLayoutConfig config={{ header: { inlineTitle: <SkillToolbarTitle title="Skill" /> } }}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="无法打开 Skill"
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </SkillLayoutConfig>
    );
  }

  if (loading && !skill) {
    return (
      <SkillLayoutConfig config={{ header: { inlineTitle: <SkillToolbarTitle title="Skill" /> } }}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span>正在加载 Skill...</span>
          </div>
        </div>
      </SkillLayoutConfig>
    );
  }

  return (
    <SkillLayoutConfig config={headerConfig}>
      <div className={styles.page}>
        <div className={styles.mainArea}>
          {skill ? (
            <div className={styles.contentRow}>
              <section className={styles.middlePanel}>
                <div className={styles.middlePanelHeader}>
                  <span className={styles.middlePanelLabel}>文件</span>
                  {canEditTree ? (
                    <div className={styles.middlePanelActions}>
                      <button
                        type="button"
                        className={styles.iconBtnSm}
                        aria-label="新建文件夹"
                        onClick={() => handleStartCreate('folder')}
                      >
                        <FolderPlus size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtnSm}
                        aria-label="新建文件"
                        onClick={() => handleStartCreate('file')}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtnSm}
                        aria-label="上传文件"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div
                  className={`${styles.treeWrap} ${isTreeDragOver ? styles.treeWrapDragOver : ''}`}
                  onDragOver={handleTreeDragOver}
                  onDragLeave={handleTreeDragLeave}
                  onDrop={handleTreeDrop}
                  onClick={handleTreeWrapClick}
                >
                  {canEditTree && isTreeDragOver ? (
                    <div className={styles.treeDropHint}>释放以上传文件</div>
                  ) : null}
                  {activeFiles.length > 0 || pendingCreate ? (
                    <SkillFileTree
                      files={activeFiles}
                      selectedFileId={selectedFileId}
                      selectedNodeId={selectedTreeNodeId}
                      expandedKeys={expandedKeys}
                      pendingCreate={pendingCreate}
                      isOwner={canEditTree}
                      onSelect={handleTreeSelect}
                      onCommitCreate={handleCommitCreate}
                      onCancelCreate={() => setPendingCreate(null)}
                      onDeleteFile={(fileId) => setDeleteTarget(findFile(activeFiles, fileId))}
                      onMoveFile={runMoveFile}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={canEdit ? '暂无文件，请上传或新建' : '暂无文件'}
                      className={styles.emptyBlock}
                    />
                  )}
                </div>
              </section>

              <main className={styles.rightPanel}>
                {selectedFile ? (
                  <>
                    <header className={styles.editorHeader}>
                      <span className={styles.editorFileName}>{selectedFile.name}</span>
                    </header>
                    <div className={styles.editorBody}>
                      <SkillEditor
                        content={editorContent}
                        fileName={selectedFile.name}
                        readOnly={
                          !editing || !canEdit || saveLoading || versionLoading || moveLoading
                        }
                        onSave={handleSave}
                        onChange={setEditorContent}
                      />
                    </div>
                  </>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="请选择文件进行编辑"
                    className={styles.emptyBlock}
                  />
                )}
              </main>
            </div>
          ) : (
            <div className={styles.middleOverlay}>
              <ResultState status="warning" title="无法打开 Skill" />
            </div>
          )}
        </div>
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === 'folder' ? '删除文件夹' : '删除文件'}
        description={
          deleteTarget?.kind === 'folder'
            ? `确定删除该文件夹「${deleteTarget?.name}」及其所有内容吗？此操作不可撤销。`
            : `确定删除该文件「${deleteTarget?.name}」吗？此操作不可撤销。`
        }
        confirmText="删除"
        onConfirm={() => {
          if (deleteTarget) runDelete(deleteTarget);
        }}
        isConfirmLoading={deleteLoading}
        isDismissable={!deleteLoading}
      />

      <UnsavedSkillChangesModal
        isOpen={publishConfirmOpen}
        mode="publish"
        isLoading={saveLoading || publishLoading}
        onCancel={() => setPublishConfirmOpen(false)}
        onDiscard={handleDiscardAndPublish}
        onConfirm={() => void handleSaveAndPublish()}
      />
      <UnsavedSkillChangesModal
        isOpen={navigationBlocker.state === 'blocked'}
        mode="leave"
        isLoading={saveLoading}
        onCancel={handleCancelLeave}
        onDiscard={handleDiscardAndLeave}
        onConfirm={() => void handleSaveAndLeave()}
      />
      <UnsavedSkillChangesModal
        isOpen={Boolean(pendingFileSwitchId)}
        mode="switchFile"
        isLoading={saveLoading}
        onCancel={handleCancelFileSwitch}
        onDiscard={handleDiscardAndSwitchFile}
        onConfirm={() => void handleSaveAndSwitchFile()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.py,.txt,.json,.yaml,.yml,.toml"
        multiple
        hidden
        onChange={(event) => void handleFileChange(event)}
      />
      <CreateSkillModal
        isOpen={createModalOpen}
        onOpenChange={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </SkillLayoutConfig>
  );
}

export default SkillView;

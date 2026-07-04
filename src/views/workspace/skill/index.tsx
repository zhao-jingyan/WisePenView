import { Empty, ResultState, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import SkillEditor from '@/components/Skill/SkillEditor';
import SkillFileTree from '@/components/Skill/SkillFileTree';
import type { SkillPendingCreate } from '@/components/Skill/SkillFileTree/index.type';
import SkillVersionDropdown from '@/components/Skill/SkillVersionDropdown';
import { useResourceService, useSkillService } from '@/domains';
import type { SkillFileNode } from '@/domains/Skill';
import { SkillServicesMap } from '@/domains/Skill';
import { useEffectForce } from '@/hooks/useEffectForce';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import {
  buildWorkspaceResourcePath,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FolderPlus, Pencil, Plus, Save, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';

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

const ROOT_PATH = '/';

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

function isPersistedAssetId(id: string): boolean {
  return !id.startsWith('local-file:');
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
  content: string
): SkillFileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, content };
    if (node.children) {
      return { ...node, children: updateTreeFileContent(node.children, id, content) };
    }
    return node;
  });
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
    setSelectedFileId(selectedFile?.id ?? '');
    setEditorContent(content);
    setSavedContent(content);
  }, [selectedFile]);

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
    navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.SKILL, newResourceId), {
      replace: true,
    });
  };

  const resolveCreateParent = useCallback(() => {
    const node = selectedTreeNode ?? selectedFile;
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
  }, [selectedFile, selectedTreeNode]);

  const handleTreeSelect = (nodeId: string) => {
    const node = findFile(activeFiles, nodeId);
    if (!node) return;
    setSelectedTreeNodeId(nodeId);
    if (node.kind === 'file') {
      setSelectedFileId(nodeId);
      setEditing(false);
    }
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
      await skillService.saveAsset(skill.resourceId, skill.draftVersion, {
        name: file.name,
        path: file.path,
        content,
      });
      return { file, content, options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setLocalFiles((prev) => updateTreeFileContent(prev, result.file.id, result.content));
        setSavedContent(result.content);
        setEditing(false);
        if (result.options?.showToast !== false) {
          toast.success('保存成功');
        }
        if (result.options?.refresh !== false) {
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
    if (isDirty) {
      setPublishConfirmOpen(true);
      return;
    }
    runPublish();
  }, [isDirty, runPublish]);

  const handleSaveAndPublish = async () => {
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      setPublishConfirmOpen(false);
      runPublish();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleCancelLeave = () => {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
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

  const handleToggleEditing = useCallback(() => {
    if (editing) {
      setEditorContent(savedContent);
      setEditing(false);
      return;
    }
    setEditing(true);
  }, [editing, savedContent]);

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
      setSelectedFileId(file.id);
      setSelectedTreeNodeId(file.id);
      setEditing(true);
    }
    setPendingCreate(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canEdit) return;
    try {
      const content = await file.text();
      const { parentFolderId, parentPath } = resolveCreateParent();
      const nextFile: SkillFileNode = {
        ...createLocalFileNode(file.name, parentPath),
        content,
        size: file.size,
      };
      setLocalFiles((prev) => appendTreeNode(prev, parentFolderId, nextFile));
      setSelectedFileId(nextFile.id);
      setSelectedTreeNodeId(nextFile.id);
      setEditing(true);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      event.target.value = '';
    }
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
            {canEdit ? (
              <>
                <Button variant="secondary" onPress={handleToggleEditing}>
                  <Pencil size={16} />
                  <span>{editing ? '取消' : '编辑'}</span>
                </Button>
                {editing ? (
                  <Button
                    variant="secondary"
                    onPress={handleSave}
                    isDisabled={!isDirty || saveLoading}
                  >
                    <Save size={16} />
                    <span>保存</span>
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onPress={handlePublish}
                  isDisabled={publishLoading || saveLoading}
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
      publishLoading,
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
                  {canEdit ? (
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
                <div className={styles.treeWrap}>
                  {activeFiles.length > 0 || pendingCreate ? (
                    <SkillFileTree
                      files={activeFiles}
                      selectedFileId={selectedFileId}
                      selectedNodeId={selectedTreeNodeId}
                      expandedKeys={expandedKeys}
                      pendingCreate={pendingCreate}
                      isOwner={canEdit}
                      onSelect={handleTreeSelect}
                      onCommitCreate={handleCommitCreate}
                      onCancelCreate={() => setPendingCreate(null)}
                      onDeleteFile={(fileId) => setDeleteTarget(findFile(activeFiles, fileId))}
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
                        readOnly={!editing || !canEdit || saveLoading || versionLoading}
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

      <Modal isOpen={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {deleteTarget?.kind === 'folder' ? '删除文件夹' : '删除文件'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className={styles.deleteModalBody}>
                <p className={styles.deleteModalText}>
                  {deleteTarget?.kind === 'folder'
                    ? `确定删除该文件夹「${deleteTarget?.name}」及其所有内容吗？此操作不可撤销。`
                    : `确定删除该文件「${deleteTarget?.name}」吗？此操作不可撤销。`}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => setDeleteTarget(null)}
                  isDisabled={deleteLoading}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (deleteTarget) runDelete(deleteTarget);
                  }}
                  isDisabled={deleteLoading}
                >
                  删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <UnsavedSkillChangesModal
        isOpen={publishConfirmOpen}
        mode="publish"
        isLoading={saveLoading || publishLoading}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => void handleSaveAndPublish()}
      />
      <UnsavedSkillChangesModal
        isOpen={navigationBlocker.state === 'blocked'}
        mode="leave"
        isLoading={saveLoading}
        onCancel={handleCancelLeave}
        onConfirm={() => void handleSaveAndLeave()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.py,.txt,.json,.yaml,.yml,.toml"
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

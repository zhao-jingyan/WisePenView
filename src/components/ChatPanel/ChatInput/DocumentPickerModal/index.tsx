import { EmptyState, LoadingState } from '@/components/Feedback';
import { Modal } from '@/components/Overlay';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useChatService } from '@/domains';
import {
  buildDocumentPickerTreeNodes,
  isDocumentPickerScopeRootKey,
  isExpandableDocumentPickerNode,
  isSelectableDocumentPickerNode,
  mapDocumentPickerNodesToSelectedResources,
  parseDocumentPickerTreeKey,
  replaceDocumentPickerTreeNodeChildren,
  type ChatDocumentPickerNode,
  type ChatDocumentPickerScope,
} from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Folder, Users } from 'lucide-react';
import type { Key } from 'react';
import { useRef, useState } from 'react';
import { useChatInputStore, useChatInputStoreApi } from '../ChatInputStore';
import styles from './style.module.less';

function buildScopeRootNode(scope: ChatDocumentPickerScope): DataNode {
  const icon =
    scope.type === 'personal' ? (
      <Folder size={14} color="var(--warning)" />
    ) : (
      <Users size={14} color="var(--accent)" />
    );

  return {
    key: scope.scopeKey,
    title: (
      <span className={styles.scopeTitle}>
        <span className={styles.scopeIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.scopeLabel}>{scope.label}</span>
      </span>
    ),
    isLeaf: false,
    selectable: false,
    checkable: false,
  };
}

function DocumentPickerContent() {
  const chatService = useChatService();
  const { addDocRefs, setDocumentPickerOpen } = useChatInputStoreApi().getState();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const scopeMapRef = useRef<Map<string, ChatDocumentPickerScope>>(new Map());
  const documentNodeMapRef = useRef<Map<string, ChatDocumentPickerNode>>(new Map());

  function buildDocumentTreeNodes(
    scopeKey: string,
    documentNodes: ChatDocumentPickerNode[]
  ): DataNode[] {
    const { treeNodes, nodeEntries } = buildDocumentPickerTreeNodes(scopeKey, documentNodes);
    nodeEntries.forEach(([key, node]) => documentNodeMapRef.current.set(key, node));
    return treeNodes;
  }

  async function loadChildren(
    scope: ChatDocumentPickerScope,
    targetKey: string,
    parentNodeId?: string
  ): Promise<void> {
    try {
      const children = await chatService.listDocumentPickerChildren({
        rootId: scope.rootId,
        groupId: scope.groupId,
        parentNodeId,
      });
      setTreeData((prev) =>
        replaceDocumentPickerTreeNodeChildren(
          prev,
          targetKey,
          buildDocumentTreeNodes(scope.scopeKey, children)
        )
      );
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  }

  const { loading: loadingScopes } = useRequest(async () => {
    scopeMapRef.current.clear();
    documentNodeMapRef.current.clear();
    setCheckedKeys([]);

    try {
      const scopes = await chatService.getDocumentPickerScopes();
      scopes.forEach((scope) => scopeMapRef.current.set(scope.scopeKey, scope));
      setTreeData(scopes.map(buildScopeRootNode));
    } catch (err) {
      toast.danger(parseErrorMessage(err));
      setTreeData([]);
    }
  });

  async function handleLoadData(treeNode: DataNode): Promise<void> {
    const key = String(treeNode.key);
    if (treeNode.children) return;

    if (isDocumentPickerScopeRootKey(key)) {
      const scope = scopeMapRef.current.get(key);
      if (scope) await loadChildren(scope, key);
      return;
    }

    const parsed = parseDocumentPickerTreeKey(key);
    if (!parsed) return;
    const scope = scopeMapRef.current.get(parsed.scopeKey);
    const documentNode = documentNodeMapRef.current.get(key);
    if (!scope || !isExpandableDocumentPickerNode(documentNode)) return;
    await loadChildren(scope, key, parsed.nodeId);
  }

  function normalizeSelectableKeys(keys: string[]): string[] {
    return keys.filter((key) =>
      isSelectableDocumentPickerNode(documentNodeMapRef.current.get(key))
    );
  }

  function handleSelect(_keys: Key[], info: { node: DataNode; selected: boolean }): void {
    const clickedKey = String(info.node.key);
    if (!isSelectableDocumentPickerNode(documentNodeMapRef.current.get(clickedKey))) return;

    setCheckedKeys((prev) => {
      const next = prev.includes(clickedKey)
        ? prev.filter((key) => key !== clickedKey)
        : [...prev, clickedKey];
      return normalizeSelectableKeys(next);
    });
  }

  function handleCheck(checked: Key[] | { checked: Key[]; halfChecked: Key[] }): void {
    const keys = Array.isArray(checked) ? checked.map(String) : checked.checked.map(String);
    setCheckedKeys(normalizeSelectableKeys(keys));
  }

  function resetModalState(): void {
    scopeMapRef.current.clear();
    documentNodeMapRef.current.clear();
    setTreeData([]);
    setCheckedKeys([]);
  }

  function handleClose(): void {
    resetModalState();
    setDocumentPickerOpen(false);
  }

  function handleConfirm(): void {
    const resources = mapDocumentPickerNodesToSelectedResources(
      checkedKeys.map((key) => documentNodeMapRef.current.get(key))
    );

    addDocRefs(resources);
    handleClose();
  }

  return (
    <>
      <Modal.Body>
        <div className={styles.wrapper}>
          <div className={styles.treeSection}>
            <div className={styles.hint}>选择要引用的文档（可多选）</div>
            <div className={styles.navTree}>
              {loadingScopes && treeData.length === 0 ? (
                <div className={styles.emptyState}>
                  <LoadingState />
                </div>
              ) : treeData.length === 0 ? (
                <div className={styles.emptyState}>
                  <EmptyState title="暂无可选文档" />
                </div>
              ) : (
                <Tree
                  className={styles.tree}
                  treeData={treeData}
                  blockNode
                  checkable
                  checkStrictly
                  selectable
                  multiple
                  selectedKeys={[]}
                  checkedKeys={checkedKeys}
                  onSelect={handleSelect}
                  onCheck={handleCheck}
                  loadData={handleLoadData}
                />
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onPress={handleClose}>
          取消
        </Button>
        <Button variant="primary" onPress={handleConfirm} isDisabled={checkedKeys.length === 0}>
          确定
        </Button>
      </Modal.Footer>
    </>
  );
}

function DocumentPickerModal() {
  const open = useChatInputStore((state) => state.documentPickerOpen);
  const { setDocumentPickerOpen } = useChatInputStoreApi().getState();

  function handleOpenChange(visible: boolean): void {
    if (visible) return;
    setDocumentPickerOpen(false);
  }

  return (
    <Modal isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>从云盘选取</Modal.Heading>
            </Modal.Header>
            <Modal.DeferredContent
              fallback={
                <>
                  <Modal.Body>
                    <div className={styles.wrapper}>
                      <div className={styles.treeSection}>
                        <div className={styles.hint}>选择要引用的文档（可多选）</div>
                        <div className={styles.navTree} />
                      </div>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={() => setDocumentPickerOpen(false)}>
                      取消
                    </Button>
                    <Button variant="primary" isDisabled>
                      确定
                    </Button>
                  </Modal.Footer>
                </>
              }
            >
              {() => <DocumentPickerContent />}
            </Modal.DeferredContent>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DocumentPickerModal;

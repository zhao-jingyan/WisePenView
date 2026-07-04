import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import type { SkillFileNode } from '@/domains/Skill';
import { FileCode2, FileText, Folder, X } from 'lucide-react';
import { useMemo } from 'react';

import type { SkillFileTreeProps, SkillPendingCreate } from './index.type';
import styles from './style.module.less';

const PENDING_KEY = '__pending_create__';

interface BuildTreeOptions {
  isOwner: boolean;
  onDeleteFile: (id: string) => void;
}

function buildTreeData(nodes: SkillFileNode[], opts: BuildTreeOptions): DataNode[] {
  function mapNode(node: SkillFileNode): DataNode {
    const isFolder = node.kind === 'folder';

    return {
      key: node.id,
      title: (
        <span className={styles.nodeRow}>
          <span className={styles.nodeTitle}>
            <span className={styles.nodeIcon} aria-hidden="true">
              {isFolder ? (
                <Folder size={14} color="var(--warning)" />
              ) : node.language === 'python' ? (
                <FileCode2 size={14} color="var(--muted)" />
              ) : (
                <FileText size={14} color="var(--muted)" />
              )}
            </span>
            <span className={styles.nodeLabel}>{node.name}</span>
          </span>
          {opts.isOwner ? (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={(event) => {
                event.stopPropagation();
                opts.onDeleteFile(node.id);
              }}
              aria-label={`删除 ${node.name}`}
            >
              <X size={12} />
            </button>
          ) : null}
        </span>
      ),
      isLeaf: !isFolder,
      children: node.children?.map(mapNode),
    };
  }

  return nodes.map(mapNode);
}

function buildPendingNode(
  pendingCreate: SkillPendingCreate,
  onCommitCreate: SkillFileTreeProps['onCommitCreate'],
  onCancelCreate: SkillFileTreeProps['onCancelCreate']
): DataNode {
  const isFolder = pendingCreate.kind === 'folder';

  return {
    key: PENDING_KEY,
    title: (
      <span className={styles.inlineInput}>
        {isFolder ? (
          <Folder size={14} color="var(--warning)" />
        ) : (
          <FileText size={14} color="var(--muted)" />
        )}
        <input
          className={styles.inlineInputField}
          autoFocus
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value) onCommitCreate(value, pendingCreate.kind);
            else onCancelCreate();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const value = event.currentTarget.value.trim();
              if (value) onCommitCreate(value, pendingCreate.kind);
              else onCancelCreate();
            }
            if (event.key === 'Escape') onCancelCreate();
          }}
        />
      </span>
    ),
    selectable: false,
    isLeaf: !isFolder,
  };
}

function insertPendingNode(
  nodes: DataNode[],
  parentFolderId: string | undefined,
  pendingNode: DataNode
): DataNode[] {
  if (!parentFolderId) return [pendingNode, ...nodes];

  return nodes.map((node) => {
    if (String(node.key) === parentFolderId) {
      return {
        ...node,
        isLeaf: false,
        children: [...(node.children ?? []), pendingNode],
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertPendingNode(node.children, parentFolderId, pendingNode),
      };
    }
    return node;
  });
}

function SkillFileTree({
  files,
  selectedFileId,
  selectedNodeId,
  expandedKeys,
  pendingCreate,
  onSelect,
  onCommitCreate,
  onCancelCreate,
  isOwner = false,
  onDeleteFile,
}: SkillFileTreeProps) {
  const opts = useMemo<BuildTreeOptions>(
    () => ({ isOwner, onDeleteFile }),
    [isOwner, onDeleteFile]
  );

  const treeData = useMemo(() => {
    const base = buildTreeData(files, opts);

    if (pendingCreate) {
      return insertPendingNode(
        base,
        pendingCreate.parentFolderId,
        buildPendingNode(pendingCreate, onCommitCreate, onCancelCreate)
      );
    }

    return base;
  }, [files, onCancelCreate, onCommitCreate, opts, pendingCreate]);

  const handleSelect = (keys: React.Key[]) => {
    const key = String(keys[0] ?? '');
    if (key && key !== PENDING_KEY) onSelect(key);
  };

  return (
    <Tree
      key={`${files.length}:${pendingCreate?.kind ?? ''}:${pendingCreate?.parentFolderId ?? 'root'}`}
      treeData={treeData}
      blockNode
      selectable
      expandAction="click"
      selectedKeys={selectedNodeId ? [selectedNodeId] : selectedFileId ? [selectedFileId] : []}
      defaultExpandedKeys={[
        ...(expandedKeys ?? []),
        ...(pendingCreate?.parentFolderId ? [pendingCreate.parentFolderId] : []),
      ]}
      onSelect={handleSelect}
    />
  );
}

export default SkillFileTree;

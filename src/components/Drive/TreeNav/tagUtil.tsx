import React from 'react';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineTag } from 'react-icons/ai';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { NodeMap } from './index.type';
import styles from './style.module.less';

function isValidTagNode(node: TagTreeNode): boolean {
  return Boolean(node?.tagId && (node.tagName ?? '').trim());
}

// 输入tag节点，输出tree可展示的tag数据节点
export function tagToDataNode(
  node: TagTreeNode,
  nodeMap: NodeMap,
  getNodeIcon?: (currentNode: TagTreeNode) => React.ReactNode
): DataNode | null {
  if (!isValidTagNode(node)) return null;
  nodeMap.set(node.tagId, node);
  const children = (node.children ?? [])
    .map((c) => tagToDataNode(c, nodeMap, getNodeIcon))
    .filter((n): n is DataNode => n != null);
  return {
    key: node.tagId,
    title: (
      <span className={styles.nodeTitle}>
        {getNodeIcon?.(node) ?? <AiOutlineTag size={14} color="var(--ant-color-primary)" />}
        {node.tagName}
      </span>
    ),
    isLeaf: children.length === 0,
    children: children.length > 0 ? children : undefined,
  };
}

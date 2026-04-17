import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Tree, Spin, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineFolder, AiOutlineTag } from 'react-icons/ai';
import { LuChevronDown } from 'react-icons/lu';
import { useLatest, useRequest } from 'ahooks';
import { useFolderService, useTagService } from '@/contexts/ServicesContext';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { mapFolderToTagTreeNode } from '@/types/folder';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { ITreeDriveAdapter } from '@/hooks/drive/useTreeDrive.type';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import type { TreeNavProps, NodeMap, TreeNavNodeKind } from './index.type';
import { ROOT_DISPLAY, createFolderDataNode, replaceNodeChildren } from './folderUtil';
import { tagToDataNode } from './tagUtil';
import type { ResourceItem } from '@/types/resource';
import {
  TREE_NAV_FILE_KEY_PREFIX,
  TREE_NAV_FILE_PAGE_SIZE,
  type NavLoadMoreMeta,
  type NavNodeBuildContext,
  buildFolderNavChildren,
  buildNavChildrenFromContents,
  replaceLoadMoreInNavTree,
  tagToLazyNavDataNode,
} from './treeNavDataUtil';
import styles from './style.module.less';

const LOAD_MORE_KEY_PREFIX = 'loadMore-';

function isLoadMoreTreeKey(key: React.Key): boolean {
  return String(key).startsWith(LOAD_MORE_KEY_PREFIX);
}

const TreeNav: React.FC<TreeNavProps> = ({
  dataMode,
  selectTarget,
  nodesMultiSelect,
  leafMultiSelect = true,
  iconMode,
  renderNodeIcon,
  groupId,
  onChange,
  refreshTrigger = 0,
  tagInitialCheckedIds,
}) => {
  const folderService = useFolderService();
  const tagService = useTagService();
  const message = useAppMessage();

  const showFiles = !(dataMode === 'tag' && selectTarget === 'nodes');
  const finalIconMode = iconMode ?? dataMode;
  const finalNodesMultiSelect = nodesMultiSelect ?? dataMode === 'tag';

  const resolveNodeIcon = useCallback(
    (kind: TreeNavNodeKind, rawNode?: TagTreeNode | ResourceItem) => {
      const customIcon = renderNodeIcon?.({ kind, dataMode, rawNode });
      if (customIcon != null) return customIcon;
      if (kind === 'branch') {
        return finalIconMode === 'tag' ? (
          <AiOutlineTag size={14} color="var(--ant-color-primary)" />
        ) : (
          <AiOutlineFolder size={14} color="var(--ant-color-warning)" />
        );
      }
      if (kind === 'file') {
        const resource = rawNode as ResourceItem | undefined;
        return (
          <FileTypeIcon
            resourceType={resource?.resourceType}
            size={14}
            color="var(--ant-color-text-secondary)"
          />
        );
      }
      return null;
    },
    [renderNodeIcon, dataMode, finalIconMode]
  );

  const adapter = useMemo<ITreeDriveAdapter>(() => {
    if (dataMode === 'folder') {
      return {
        loadTree: async (gid) =>
          mapFolderToTagTreeNode(await folderService.getFolderTree({ groupId: gid })),
        getNodeById: (nodeId, gid) => {
          const f = folderService.getFolderById(nodeId, gid);
          return f ? mapFolderToTagTreeNode(f) : undefined;
        },
        getNodeContents: async ({ node, filePage, filePageSize }) => {
          const res = await folderService.getResByFolder({
            folder: node,
            filePage,
            filePageSize,
          });
          return {
            childNodes: res.folders.map(mapFolderToTagTreeNode),
            files: res.files,
            totalFiles: res.totalFiles,
          };
        },
      };
    }
    return {
      loadTree: async () => {
        throw new Error('TreeNav tag mode does not use adapter.loadTree');
      },
      getNodeById: (nodeId, gid) => tagService.getTagById(nodeId, gid),
      getNodeContents: async ({ node, filePage, filePageSize }) => {
        const res = await tagService.getResByTag({ tag: node, filePage, filePageSize });
        return { childNodes: res.tags, files: res.files, totalFiles: res.totalFiles };
      },
    };
  }, [dataMode, folderService, tagService]);

  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [checkedTagKeys, setCheckedTagKeys] = useState<React.Key[]>([]);

  const nodeMapRef = useRef<NodeMap>(new Map());
  const loadMoreMetaRef = useRef<Map<string, NavLoadMoreMeta>>(new Map());
  const resourceByIdRef = useRef<Map<string, ResourceItem>>(new Map());
  const onChangeRef = useLatest(onChange);
  const inflightLoadMoreRef = useRef<Set<string>>(new Set());

  const tagInitialCheckKey = useMemo(() => {
    if (tagInitialCheckedIds === undefined) return '';
    return [...tagInitialCheckedIds].sort().join('\u0001');
  }, [tagInitialCheckedIds]);

  const handleLoadMore = useCallback(
    async (loadMoreKey: string) => {
      const meta = loadMoreMetaRef.current.get(loadMoreKey);
      if (!meta || inflightLoadMoreRef.current.has(loadMoreKey)) return;
      inflightLoadMoreRef.current.add(loadMoreKey);
      try {
        const res = await adapter.getNodeContents({
          node: meta.treeNode,
          filePage: meta.nextPage,
          filePageSize: TREE_NAV_FILE_PAGE_SIZE,
        });
        const ctx: NavNodeBuildContext = {
          nodeMap: nodeMapRef.current,
          resourceById: resourceByIdRef.current,
          loadMoreMetaByKey: loadMoreMetaRef.current,
          showFiles,
          selectTarget,
          dataMode,
          renderNodeIcon: ({ kind, rawNode }) => resolveNodeIcon(kind, rawNode),
          onLoadMoreClick: (k) => void handleLoadMore(k),
        };
        setTreeData((prev) =>
          replaceLoadMoreInNavTree(
            prev,
            loadMoreKey,
            meta.parentKey,
            res.files,
            res.totalFiles,
            meta.loadedFiles,
            meta.nextPage,
            meta.treeNode,
            ctx
          )
        );
      } catch (err) {
        message.error(parseErrorMessage(err, '加载更多文件失败'));
      } finally {
        inflightLoadMoreRef.current.delete(loadMoreKey);
      }
    },
    [adapter, message, showFiles, selectTarget, dataMode, resolveNodeIcon]
  );

  const handleLoadMoreRef = useLatest(handleLoadMore);

  // folder
  const { loading: folderLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles,
        selectTarget,
        dataMode,
        renderNodeIcon: ({ kind, rawNode }) => resolveNodeIcon(kind, rawNode),
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      const root = await folderService.getFolderTree({ groupId });
      const childNodes = await buildFolderNavChildren(root, ctx, folderService);
      const rootNode: DataNode = {
        ...createFolderDataNode(
          root,
          nodeMapRef.current,
          ROOT_DISPLAY,
          resolveNodeIcon('branch', mapFolderToTagTreeNode(root))
        ),
        checkable: false,
        selectable: selectTarget === 'nodes',
        children: childNodes,
      };
      return [rootNode];
    },
    {
      ready: dataMode === 'folder',
      refreshDeps: [
        dataMode,
        groupId,
        refreshTrigger,
        folderService,
        showFiles,
        selectTarget,
        finalIconMode,
        renderNodeIcon,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        setSelectedKeys([]);
        onChangeRef.current?.([], []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取文件夹树失败'));
        setTreeData([]);
      },
    }
  );

  // tag + nodes（完整树，无文件）
  const { loading: tagNodesLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const nodes = await tagService.getTagTree(groupId);
      return nodes
        .map((n) =>
          tagToDataNode(n, nodeMapRef.current, (currentNode) =>
            resolveNodeIcon('branch', currentNode)
          )
        )
        .filter((n): n is DataNode => n != null);
    },
    {
      ready: dataMode === 'tag' && selectTarget === 'nodes',
      refreshDeps: [
        dataMode,
        selectTarget,
        finalNodesMultiSelect,
        groupId,
        refreshTrigger,
        tagService,
        tagInitialCheckKey,
        tagInitialCheckedIds,
        finalIconMode,
        renderNodeIcon,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        const initialIds = (tagInitialCheckedIds ?? []).filter((id) => nodeMapRef.current.has(id));
        const normalizedInitialIds = finalNodesMultiSelect
          ? initialIds
          : initialIds.length > 0
            ? [initialIds[initialIds.length - 1]]
            : [];
        if (finalNodesMultiSelect) {
          setCheckedTagKeys(normalizedInitialIds);
          setSelectedKeys([]);
        } else {
          setCheckedTagKeys([]);
          setSelectedKeys(normalizedInitialIds);
        }
        const selectedNodes = normalizedInitialIds
          .map((k) => nodeMapRef.current.get(String(k)))
          .filter((n): n is TagTreeNode => n != null);
        onChangeRef.current?.(selectedNodes, []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
      },
    }
  );

  // tag + leaves（懒加载子标签与文件）
  const { loading: tagLeavesLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles: true,
        selectTarget,
        dataMode,
        renderNodeIcon: ({ kind, rawNode }) => resolveNodeIcon(kind, rawNode),
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      const nodes = await tagService.getTagTree(groupId);
      return nodes.map((n) => tagToLazyNavDataNode(n, ctx)).filter((n): n is DataNode => n != null);
    },
    {
      ready: dataMode === 'tag' && selectTarget === 'leaves',
      refreshDeps: [
        dataMode,
        selectTarget,
        groupId,
        refreshTrigger,
        tagService,
        finalIconMode,
        renderNodeIcon,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        setSelectedKeys([]);
        onChangeRef.current?.([], []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
      },
    }
  );

  const loading = folderLoading || tagNodesLoading || tagLeavesLoading;

  const handleLoadFolderData = useCallback(
    async (treeNode: DataNode) => {
      const key = String(treeNode.key);
      if (key.startsWith(TREE_NAV_FILE_KEY_PREFIX) || isLoadMoreTreeKey(key)) return;
      const folder = folderService.getFolderById(key, groupId);
      if (!folder) return;

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles,
        selectTarget,
        dataMode,
        renderNodeIcon: ({ kind, rawNode }) => resolveNodeIcon(kind, rawNode),
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };
      try {
        const children = await buildFolderNavChildren(folder, ctx, folderService);
        setTreeData((prev) => replaceNodeChildren(prev, key, children));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载文件夹内容失败'));
      }
    },
    [
      folderService,
      groupId,
      showFiles,
      selectTarget,
      dataMode,
      message,
      handleLoadMoreRef,
      resolveNodeIcon,
    ]
  );

  const handleLoadTagLeavesData = useCallback(
    async (treeNode: DataNode) => {
      const key = String(treeNode.key);
      if (key.startsWith(TREE_NAV_FILE_KEY_PREFIX) || isLoadMoreTreeKey(key)) return;
      const tag = nodeMapRef.current.get(key);
      if (!tag) return;

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles: true,
        selectTarget,
        dataMode,
        renderNodeIcon: ({ kind, rawNode }) => resolveNodeIcon(kind, rawNode),
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      try {
        const res = await adapter.getNodeContents({
          node: tag,
          filePage: 1,
          filePageSize: TREE_NAV_FILE_PAGE_SIZE,
        });
        const children = buildNavChildrenFromContents(
          res.childNodes,
          res.files,
          res.totalFiles,
          key,
          tag,
          ctx,
          (n) => tagToLazyNavDataNode(n, ctx)
        );
        setTreeData((prev) => replaceNodeChildren(prev, key, children));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载标签内容失败'));
      }
    },
    [adapter, selectTarget, dataMode, message, handleLoadMoreRef, resolveNodeIcon]
  );

  const loadDataProp =
    dataMode === 'folder'
      ? handleLoadFolderData
      : dataMode === 'tag' && selectTarget === 'leaves'
        ? handleLoadTagLeavesData
        : undefined;

  const handleSelectNodes = useCallback(
    (keys: React.Key[]) => {
      if (selectTarget !== 'nodes') return;
      const normalizedKeys = finalNodesMultiSelect ? keys : keys.slice(0, 1);
      setSelectedKeys(normalizedKeys);
      if (keys.length === 0) {
        onChangeRef.current?.([], []);
      } else {
        const selectedNodes = normalizedKeys
          .map((k) => nodeMapRef.current.get(String(k)))
          .filter((n): n is TagTreeNode => n != null);
        onChangeRef.current?.(selectedNodes, []);
      }
    },
    [selectTarget, onChangeRef, finalNodesMultiSelect]
  );

  const handleCheckTags = useCallback(
    (
      checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] },
      info?: { node: DataNode; checked: boolean }
    ) => {
      if (dataMode !== 'tag' || selectTarget !== 'nodes') return;
      const keys = (Array.isArray(checked) ? checked : checked.checked).map(String);
      const normalizedKeys = (() => {
        if (finalNodesMultiSelect) return keys;
        const clickedKey = String(info?.node?.key ?? '');
        if (clickedKey && !clickedKey.startsWith(TREE_NAV_FILE_KEY_PREFIX)) {
          return info?.checked ? [clickedKey] : [];
        }
        return keys.length > 0 ? [keys[keys.length - 1]] : [];
      })();
      setCheckedTagKeys(normalizedKeys);
      const nodes = normalizedKeys
        .map((k) => nodeMapRef.current.get(String(k)))
        .filter((n): n is TagTreeNode => n != null);
      onChangeRef.current?.(nodes, []);
    },
    [dataMode, selectTarget, onChangeRef, finalNodesMultiSelect]
  );

  const handleSelectLeaves = useCallback(
    (keys: React.Key[], info: { node: DataNode; selected: boolean }) => {
      if (selectTarget !== 'leaves') return;
      const fileKeys = keys
        .filter((k) => String(k).startsWith(TREE_NAV_FILE_KEY_PREFIX))
        .map(String);
      const normalizedFileKeys = (() => {
        if (leafMultiSelect) return fileKeys;
        const clickedKey = String(info.node?.key ?? '');
        if (clickedKey.startsWith(TREE_NAV_FILE_KEY_PREFIX)) {
          return info.selected ? [clickedKey] : [];
        }
        return fileKeys.length > 0 ? [fileKeys[fileKeys.length - 1]] : [];
      })();
      setSelectedKeys(normalizedFileKeys);
      const leaves = normalizedFileKeys
        .map((k) => resourceByIdRef.current.get(String(k).slice(TREE_NAV_FILE_KEY_PREFIX.length)))
        .filter((x): x is ResourceItem => x != null);
      onChangeRef.current?.([], leaves);
    },
    [selectTarget, onChangeRef, leafMultiSelect]
  );

  const handleTreeSelect = useCallback(
    (keys: React.Key[], info: { node: DataNode; selected: boolean }) => {
      if (selectTarget === 'nodes') {
        handleSelectNodes(keys);
      } else if (selectTarget === 'leaves') {
        handleSelectLeaves(keys, info);
      }
    },
    [selectTarget, handleSelectNodes, handleSelectLeaves]
  );

  const nodeCheckable = dataMode === 'tag' && selectTarget === 'nodes' && finalNodesMultiSelect;
  const treeCheckable = nodeCheckable;

  const treeSelectable = (selectTarget === 'nodes' && !nodeCheckable) || selectTarget === 'leaves';

  const checkedKeysForTree = nodeCheckable ? checkedTagKeys : undefined;

  const onCheckProp = nodeCheckable ? handleCheckTags : undefined;

  const treeMultiple =
    (selectTarget === 'nodes' && finalNodesMultiSelect) ||
    (selectTarget === 'leaves' && leafMultiSelect);

  if (loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Spin />
      </div>
    );
  }

  if (!loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Empty description={dataMode === 'tag' ? '暂无标签' : '暂无内容'} />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.treeArea}>
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          checkable={treeCheckable}
          checkStrictly={treeCheckable}
          selectable={treeSelectable}
          selectedKeys={treeSelectable ? selectedKeys : []}
          checkedKeys={checkedKeysForTree}
          multiple={treeSelectable && treeMultiple}
          onSelect={treeSelectable ? handleTreeSelect : undefined}
          onCheck={onCheckProp}
          loadData={loadDataProp}
          defaultExpandAll={dataMode === 'tag' && selectTarget === 'nodes'}
          defaultExpandedKeys={
            dataMode === 'folder' && treeData.length > 0 ? [treeData[0].key] : []
          }
          switcherIcon={
            <span>
              <LuChevronDown size={14} />
            </span>
          }
        />
      </div>
    </div>
  );
};

export default TreeNav;

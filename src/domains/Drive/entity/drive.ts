import type { ResourceIconType } from '@/domains/Resource';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';

export type DriveNodeType = 'root' | 'folder' | 'resource' | 'link' | 'loading';

export type DriveNodeScope =
  | {
      type: 'personal';
      rootId: string;
    }
  | {
      type: 'group';
      rootId: string;
      groupId: string;
    };

interface DriveNodeBase {
  /** 此处 id 由 service 分配，用于在 service 中查找节点 */
  id: string;
  parentId: string | null;
  /** 节点所属的 Drive 根作用域，用于并列展示个人盘和多个小组盘。 */
  scope: DriveNodeScope;
}

interface RootNode extends DriveNodeBase {
  type: 'root';
  name: string;
  /** 个人云盘有真实 root tag；小组 root 是虚拟容器，没有 tagId。 */
  tagId?: string;
  /** 小组 root 只是 group 自身的视图入口；个人 root 是真实 root tag 的抽象节点。 */
  isVirtual: boolean;
  /** 只有带真实 tagId 的个人 root 允许直接挂载资源。 */
  canMountResources: boolean;
  childrenIds: string[];
}

interface FolderNode extends DriveNodeBase {
  type: 'folder';
  tagId: string;
  name: string;
  childrenIds: string[];
}

interface DriveResourceNodeBase extends DriveNodeBase {
  resourceId: string;
  title: string;
  resourceType?: string;
  resourceIconType: ResourceIconType;
  /** 当前节点所在目录 tag，用来描述资源是主挂载还是辅助挂载 */
  folderTagId: string;
}

interface ResourceNode extends DriveResourceNodeBase {
  type: 'resource';
}

interface LinkNode extends DriveResourceNodeBase {
  type: 'link';
  /** 资源主挂载 tag；后端未返回有序 tag 时允许为空 */
  primaryTagId?: string;
}

/** 加载占位节点：仅用于组件展示当前目录正在拉取子节点，不代表真实文件或文件夹 */
interface LoadingNode extends DriveNodeBase {
  type: 'loading';
  parentId: string;
  label?: string;
}

export type DriveNode = RootNode | FolderNode | ResourceNode | LinkNode | LoadingNode;
export type { FolderNode, LinkNode, LoadingNode, ResourceNode, RootNode };

export const DRIVE_ROOT_ID = 'drive-root';
const DRIVE_GROUP_ROOT_PREFIX = 'drive-root:group:';

export type EncodedNodeKind = 'folder' | 'resource' | 'link' | 'loading';

export type DecodedNodeId =
  | { kind: 'root'; groupId?: string }
  | { kind: 'folder'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'loading'; parentNodeId: string }
  | { kind: 'unknown'; raw: string };

export const encodeNodeId = (
  kind: EncodedNodeKind,
  firstPart?: string,
  secondPart?: string
): string => {
  const parts: string[] = [kind];
  if (firstPart !== undefined) {
    parts.push(firstPart);
  }
  if (secondPart !== undefined) {
    parts.push(secondPart);
  }
  return parts.join(':');
};

export const encodeRootNodeId = (groupId?: string): string => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  if (normalizedGroupId) {
    return `${DRIVE_GROUP_ROOT_PREFIX}${normalizedGroupId}`;
  }
  return DRIVE_ROOT_ID;
};

export const buildDriveNodeScope = (groupId?: string): DriveNodeScope => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  const rootId = encodeRootNodeId(normalizedGroupId);
  if (normalizedGroupId) {
    return {
      type: 'group',
      rootId,
      groupId: normalizedGroupId,
    };
  }
  return {
    type: 'personal',
    rootId,
  };
};

export const decodeNodeId = (id: string): DecodedNodeId => {
  if (id === DRIVE_ROOT_ID) return { kind: 'root' };
  if (id.startsWith(DRIVE_GROUP_ROOT_PREFIX)) {
    const groupId = id.slice(DRIVE_GROUP_ROOT_PREFIX.length);
    if (groupId) return { kind: 'root', groupId };
  }
  const parts = id.split(':');
  const kind = parts[0];
  const firstPart = parts[1];
  const secondPart = parts[2];
  if (kind === 'folder' && firstPart) return { kind: 'folder', tagId: firstPart };
  if (kind === 'resource' && firstPart && secondPart) {
    return { kind: 'resource', resourceId: firstPart, parentTagId: secondPart };
  }
  if (kind === 'link' && firstPart && secondPart) {
    return { kind: 'link', resourceId: firstPart, parentTagId: secondPart };
  }
  if (kind === 'loading' && firstPart) return { kind: 'loading', parentNodeId: firstPart };
  return { kind: 'unknown', raw: id };
};

export const decodeRootNodeScope = (rootId?: string, fallbackGroupId?: string): DriveNodeScope => {
  if (!rootId) return buildDriveNodeScope(fallbackGroupId);
  const decoded = decodeNodeId(rootId);
  let groupId = fallbackGroupId;
  if (decoded.kind === 'root') {
    groupId = decoded.groupId ?? fallbackGroupId;
  }
  return buildDriveNodeScope(groupId);
};

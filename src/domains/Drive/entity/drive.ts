import type { ResourceIconType } from '@/domains/Resource';

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
  description?: string;
  childrenIds: string[];
}

interface DriveResourceNodeBase extends DriveNodeBase {
  resourceId: string;
  title: string;
  resourceType?: string;
  resourceIconType: ResourceIconType;
  description?: string;
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

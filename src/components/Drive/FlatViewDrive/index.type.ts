export interface FlatViewDriveProps {
  /** 小组 ID，不传则展示个人资源（按标签管理） */
  groupId?: string;
  /** 筛选面板默认是否折叠，默认 true */
  defaultFilterCollapsed?: boolean;
}

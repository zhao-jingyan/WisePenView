import type { MenuProps } from 'antd';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** 与 antd Menu items 兼容的侧栏菜单项 */
export type SidebarMenuItem = NonNullable<MenuProps['items']>[number];

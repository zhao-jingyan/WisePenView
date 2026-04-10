export interface SidebarMenuProps {
  collapsed: boolean;
}

export interface SidebarMenuRef {
  handleCreatedSession: (sessionId: string, sessionTitle: string) => Promise<void>;
}

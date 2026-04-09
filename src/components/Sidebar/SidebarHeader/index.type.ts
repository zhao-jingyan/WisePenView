export interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  onSessionCreated: (sessionId: string) => void;
}

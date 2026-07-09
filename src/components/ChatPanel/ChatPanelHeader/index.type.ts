export interface ChatPanelHeaderProps {
  collapsed: boolean;
  fullWidth: boolean;
  panelTitle: string;
  sessionBarOpen?: boolean;
  showCollapseButton: boolean;
  onCollapsePanel: () => void;
  onNewChat: () => void;
  onToggleSessionBar?: () => void;
}

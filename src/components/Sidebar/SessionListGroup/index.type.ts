export interface SessionListGroupProps {
  activeSessionMenuKey?: string;
  onActiveSessionMenuKeyChange: (key: string | undefined) => void;
}

export interface SessionListGroupRef {
  refresh: () => Promise<void>;
}

export interface SkillVersionDropdownItem {
  key: string;
  version: number;
  current: boolean;
}

export interface SkillVersionDropdownProps {
  items: SkillVersionDropdownItem[];
  disabledKeys?: Set<string>;
  formatVersion: (version: number) => string;
  onSelect?: (version: number) => void;
}

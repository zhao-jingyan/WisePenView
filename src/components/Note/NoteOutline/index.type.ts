export interface NoteOutlineItem {
  id: string;
  level: number;
  text: string;
}

export interface NoteOutlineProps {
  items: NoteOutlineItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
  /**
   * 可选：最大展示标题层级。
   * 若设置，则 level > maxLevel 的标题会被过滤掉。
   */
  maxLevel?: number;
}

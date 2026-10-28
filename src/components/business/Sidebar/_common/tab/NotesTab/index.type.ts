export interface SidebarNoteItem {
  resourceId: string;
  title: string;
  /** NoteService 已格式化的最后编辑时间，用于排序和分桶。 */
  lastEditedAtText: string;
}

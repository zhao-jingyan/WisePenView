import type { SkillFileNode } from '@/domains/Skill';

export interface SkillPendingCreate {
  kind: 'file' | 'folder';
  parentFolderId?: string;
}

export interface SkillFileTreeProps {
  files: SkillFileNode[];
  selectedFileId?: string;
  selectedNodeId?: string;
  expandedKeys?: string[];
  pendingCreate?: SkillPendingCreate | null;
  isOwner?: boolean;
  onSelect: (fileId: string) => void;
  onCommitCreate: (name: string, kind: 'file' | 'folder') => void;
  onCancelCreate: () => void;
  onDeleteFile: (fileId: string) => void;
}

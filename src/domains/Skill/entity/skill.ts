import type { SkillVersionStatus } from '../enum';

export type SkillScopeType = 'PERSONAL' | 'GROUP';

export interface SkillFileNode {
  id: string;
  name: string;
  path: string;
  kind: 'folder' | 'file';
  language?: string;
  content?: string;
  objectKey?: string;
  uploadStatus?: string;
  size?: number;
  children?: SkillFileNode[];
}

export interface SkillSummary {
  resourceId: string;
  title: string;
  skillName: string;
  description: string;
  version: number;
  status: SkillVersionStatus;
  updatedAt: string;
  creatorId: string;
  scopeType: SkillScopeType;
  groupId?: string;
  groupName?: string;
}

export interface SkillDetail extends SkillSummary {
  draftVersion: number;
  fileCount: number;
  files: SkillFileNode[];
  isOwner: boolean;
}

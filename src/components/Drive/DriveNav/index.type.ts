import type { DriveNode } from '@/domains/Drive';
import type { DriveScope, DriveSelectionItem } from '../common/driveComponentModel';

export type DriveNavRenderableType = 'folder' | 'resource' | 'link' | 'trash';
export type DriveNavSelectableType = 'folder' | 'resource' | 'link';

export interface DriveNavProps {
  rootId?: string;
  scope?: DriveScope;
  groupId?: string;
  renderableTypes?: DriveNavRenderableType[];
  selectableTypes?: DriveNavSelectableType[];
  disabledNodeIds?: string[];
  multiple?: boolean;
  initialSelectedIds?: string[];
  refreshTrigger?: number;
  onChange?: (selected: DriveSelectionItem[]) => void;
  onNodeChange?: (selected: DriveNode[]) => void;
}

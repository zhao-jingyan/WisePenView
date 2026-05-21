import type { DriveActionTarget } from '../../../common/driveComponentModel';

export interface MoveNodeModalProps {
  open: boolean;
  node: DriveActionTarget | null;
  rootId: string;
  groupId?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

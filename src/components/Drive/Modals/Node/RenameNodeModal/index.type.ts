import type { DriveActionTarget } from '../../../common/driveComponentModel';

export interface RenameNodeModalProps {
  open: boolean;
  node: DriveActionTarget | null;
  groupId?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

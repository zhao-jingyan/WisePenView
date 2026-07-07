import type { ResourcePermissionResourceType } from '@/domains/Resource';

export interface ResourcePermissionControlProps {
  resourceId: string;
  resourceType?: ResourcePermissionResourceType;
  ownerId?: string | number | null;
  isDisabled?: boolean;
  onSuccess?: () => void;
}

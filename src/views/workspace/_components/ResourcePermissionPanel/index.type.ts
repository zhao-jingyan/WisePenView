import type { ResourcePermissionResourceType } from '@/domains/Resource';

export interface ResourcePermissionPanelProps {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
  onSuccess?: () => void;
}

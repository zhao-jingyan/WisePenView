import type { ResourceItem } from '@/domains/Resource';

export interface ResourceDiscussionPanelProps {
  resource: ResourceItem;
  onInteractionSuccess?: () => unknown | Promise<unknown>;
}

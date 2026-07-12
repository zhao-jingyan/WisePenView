import type { DriveNodeScope } from '@/domains/Drive';

export interface SearchResultListProps {
  keyword: string;
  scope: DriveNodeScope;
  onClose: () => void;
}

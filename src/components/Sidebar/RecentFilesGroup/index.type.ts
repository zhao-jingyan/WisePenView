import type { RecentFileItem } from '@/store/zustand/useRecentFilesStore';

export interface RecentFilesGroupProps {
  items: RecentFileItem[];
  onOpenFile: (resourceId: string) => void;
  onCloseFile: (resourceId: string) => void;
}

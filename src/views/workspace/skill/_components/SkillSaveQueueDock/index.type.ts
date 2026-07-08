export type SkillSaveQueuePhase = 'pending' | 'preparing' | 'uploading' | 'done' | 'failed';

export interface SkillSaveQueueItem {
  id: string;
  name: string;
  path: string;
  phase: SkillSaveQueuePhase;
  progress: number;
  size?: number;
  errorMessage?: string;
}

export interface SkillSaveQueueDockProps {
  items: SkillSaveQueueItem[];
  onRetry?: () => void;
}

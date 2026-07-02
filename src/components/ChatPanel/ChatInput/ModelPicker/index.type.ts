import type { Model } from '@/components/ChatPanel/index.type';

export interface ModelPickerProps {
  open: boolean;
  loading: boolean;
  models: Model[];
  selectedModel: Model | null;
  onOpenChange: (open: boolean) => void;
  onChange: (model: Model) => void;
}

import { createContext } from 'react';
import type { LocalAttachmentPayload } from './index.type';

export interface ChatInputFileContextValue {
  openLocalFilePicker: () => void;
  routeFiles: (fileList: FileList | File[]) => Promise<void>;
  preparePendingAttachments: () => Promise<LocalAttachmentPayload[] | null>;
  clearPendingFileCache: () => void;
}

export const ChatInputFileContext = createContext<ChatInputFileContextValue | null>(null);

import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearRecentFilesStore } from './useRecentFilesStore';
import { clearTrashTagStore } from './useTrashTagStore';
import { clearTreeDriveCwdStores } from './useTreeDriveCwdStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';

export function clearAllZustandStores(): void {
  clearChatModelPreferenceStore();
  clearChatPanelStore();
  clearCurrentChatSessionStore();
  clearRecentFilesStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearTreeDriveCwdStores();
  clearNewNoteStore();
  clearNewChatSessionStore();
}

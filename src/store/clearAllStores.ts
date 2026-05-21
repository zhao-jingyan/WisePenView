import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearTrashTagStore } from './useTrashTagStore';

export function clearAllZustandStores(): void {
  clearActiveDriveScopeStore();
  clearChatModelPreferenceStore();
  clearChatPanelStore();
  clearCurrentChatSessionStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearNewNoteStore();
  clearNewChatSessionStore();
}

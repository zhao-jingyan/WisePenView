import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearAiDiffDisplayStore } from './useAiDiffDisplayStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearResourceDisplayNameStore } from './useResourceDisplayNameStore';
import { clearTrashTagStore } from './useTrashTagStore';

export function clearAllZustandStores(): void {
  clearActiveDriveScopeStore();
  clearChatModelPreferenceStore();
  clearChatPanelStore();
  clearCurrentChatSessionStore();
  clearResourceDisplayNameStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearAiDiffDisplayStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearNewNoteStore();
  clearNewChatSessionStore();
}

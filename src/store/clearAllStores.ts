import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearAdvancedModeStore } from './useAdvancedModeStore';
import { clearAiDiffDisplayStore } from './useAiDiffDisplayStore';
import { clearChatAgentStore } from './useChatAgentStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearChatSkillMenuStore } from './useChatSkillMenuStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearDriveUploadQueueStore } from './useDriveUploadQueueStore';
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
  clearDriveUploadQueueStore();
  clearAiDiffDisplayStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearNewNoteStore();
  clearNewChatSessionStore();
  clearChatAgentStore();
  clearAdvancedModeStore();
  clearChatSkillMenuStore();
}

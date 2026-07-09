import { clearActiveDriveScopeStore } from './useActiveDriveScopeStore';
import { clearAdvancedModeStore } from './useAdvancedModeStore';
import { clearAiDiffDisplayStore } from './useAiDiffDisplayStore';
import { clearChatAgentStore } from './useChatAgentStore';
import { clearChatCapabilityStore } from './useChatCapabilityStore';
import { clearChatModelPreferenceStore } from './useChatModelPreferenceStore';
import { clearChatPanelStore } from './useChatPanelStore';
import { clearChatSessionHistoryRefreshStore } from './useChatSessionHistoryRefreshStore';
import { clearCurrentChatSessionStore } from './useCurrentChatSessionStore';
import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearDriveUploadQueueStore } from './useDriveUploadQueueStore';
import { clearNewChatSessionStore } from './useNewChatSessionStore';
import { clearNewNoteStore } from './useNewNoteStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearResourceDisplayNameStore } from './useResourceDisplayNameStore';
import { clearSystemLayoutStore } from './useSystemLayoutStore';
import { clearTrashTagStore } from './useTrashTagStore';

export function clearAllZustandStores(): void {
  clearActiveDriveScopeStore();
  clearChatModelPreferenceStore();
  clearChatPanelStore();
  clearChatSessionHistoryRefreshStore();
  clearCurrentChatSessionStore();
  clearResourceDisplayNameStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearDriveUploadQueueStore();
  clearAiDiffDisplayStore();
  clearTrashTagStore();
  clearNewNoteStore();
  clearNewChatSessionStore();
  clearChatAgentStore();
  clearAdvancedModeStore();
  clearChatCapabilityStore();
  clearSystemLayoutStore();
}

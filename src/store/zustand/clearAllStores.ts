import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearNoteSelectionStore } from './useNoteSelectionStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearRecentFilesStore } from './useRecentFilesStore';
import { clearTrashTagStore } from './useTrashTagStore';
import { clearPendingVerifyEmailStore } from './usePendingVerifyEmailStore';
import { clearTreeDriveCwdStores } from './useTreeDriveCwdStore';

export function clearAllZustandStores(): void {
  clearRecentFilesStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearNoteSelectionStore();
  clearTrashTagStore();
  clearPendingVerifyEmailStore();
  clearTreeDriveCwdStores();
}

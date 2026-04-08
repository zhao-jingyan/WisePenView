import { clearDrivePreferencesStore } from './useDrivePreferencesStore';
import { clearPdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { clearRecentFilesStore } from './useRecentFilesStore';
import { clearTrashTagStore } from './useTrashTagStore';
import { clearPendingVerifyEmailStore } from './usePendingVerifyEmailStore';
import { clearTreeDriveCwdStores } from './useTreeDriveCwdStore';

export function clearAllZustandStores(): void {
  clearRecentFilesStore();
  clearPdfPreviewProgressStore();
  clearDrivePreferencesStore();
  clearTrashTagStore();
  clearPendingVerifyEmailStore();
  clearTreeDriveCwdStores();
}

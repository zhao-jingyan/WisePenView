import type { NoteCommentsStatus } from '../../../index.type';

interface NoteCommentsRuntimeState {
  enabled: boolean;
  uiEnabled: boolean;
  hasWritePermission: boolean;
  canWrite: boolean;
}

export function resolveNoteCommentsRuntimeState(
  status: NoteCommentsStatus
): NoteCommentsRuntimeState {
  if (status.kind === 'disabled') {
    return { enabled: false, uiEnabled: false, hasWritePermission: false, canWrite: false };
  }
  if (status.kind === 'connecting') {
    return {
      enabled: true,
      uiEnabled: false,
      hasWritePermission: status.hasWritePermission,
      canWrite: false,
    };
  }
  if (status.kind === 'readOnly') {
    return { enabled: true, uiEnabled: true, hasWritePermission: false, canWrite: false };
  }
  return { enabled: true, uiEnabled: true, hasWritePermission: true, canWrite: true };
}

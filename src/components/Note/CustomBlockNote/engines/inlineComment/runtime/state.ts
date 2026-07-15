import type { NoteInlineCommentStatus } from '../../../index.type';

interface NoteInlineCommentRuntimeState {
  enabled: boolean;
  uiEnabled: boolean;
  hasWritePermission: boolean;
  canWrite: boolean;
}

export function resolveNoteInlineCommentRuntimeState(
  status: NoteInlineCommentStatus
): NoteInlineCommentRuntimeState {
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

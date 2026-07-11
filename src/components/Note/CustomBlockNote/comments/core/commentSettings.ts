import type { Doc } from 'yjs';
import * as Y from 'yjs';

/** 文档级批注可见性策略（owner 在「更多」中配置，协同同步） */
export const BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP = 'comment-settings' as const;

const COMMENT_SETTINGS_VISIBILITY_KEY = 'collaboratorVisibility' as const;
/** 旧版嵌套结构键，仅用于读取兼容 */
const LEGACY_COMMENT_SETTINGS_KEY = 'settings' as const;

export type CollaboratorCommentVisibility = 'all' | 'own_only';

export type CommentSettings = {
  collaboratorVisibility: CollaboratorCommentVisibility;
};

export const DEFAULT_COMMENT_SETTINGS: CommentSettings = {
  collaboratorVisibility: 'all',
};

function normalizeCollaboratorVisibility(value: unknown): CollaboratorCommentVisibility | null {
  if (value === 'own_only' || value === 'all') {
    return value;
  }
  return null;
}

function readVisibilityFromYMap(raw: Y.Map<unknown>): CollaboratorCommentVisibility | null {
  return normalizeCollaboratorVisibility(raw.get(COMMENT_SETTINGS_VISIBILITY_KEY));
}

function readVisibilityFromPlainObject(
  raw: Record<string, unknown>
): CollaboratorCommentVisibility | null {
  return normalizeCollaboratorVisibility(raw[COMMENT_SETTINGS_VISIBILITY_KEY]);
}

export function readCommentSettings(raw: unknown): CommentSettings {
  if (raw instanceof Y.Map) {
    const visibility = readVisibilityFromYMap(raw);
    return visibility ? { collaboratorVisibility: visibility } : DEFAULT_COMMENT_SETTINGS;
  }
  if (typeof raw !== 'object' || raw === null) {
    return DEFAULT_COMMENT_SETTINGS;
  }
  const visibility = readVisibilityFromPlainObject(raw as Record<string, unknown>);
  return visibility ? { collaboratorVisibility: visibility } : DEFAULT_COMMENT_SETTINGS;
}

export function getBlockNoteCommentSettingsYMap(doc: Doc) {
  return doc.getMap<unknown>(BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP);
}

export function getCommentSettingsFromDoc(doc: Doc): CommentSettings {
  const map = getBlockNoteCommentSettingsYMap(doc);
  const flatVisibility = normalizeCollaboratorVisibility(map.get(COMMENT_SETTINGS_VISIBILITY_KEY));
  if (flatVisibility) {
    return { collaboratorVisibility: flatVisibility };
  }

  const legacyStored = map.get(LEGACY_COMMENT_SETTINGS_KEY);
  return readCommentSettings(legacyStored);
}

export function setCommentSettingsOnDoc(doc: Doc, settings: CommentSettings): void {
  const map = getBlockNoteCommentSettingsYMap(doc);
  doc.transact(() => {
    map.set(COMMENT_SETTINGS_VISIBILITY_KEY, settings.collaboratorVisibility);
    if (map.has(LEGACY_COMMENT_SETTINGS_KEY)) {
      map.delete(LEGACY_COMMENT_SETTINGS_KEY);
    }
  });
}

import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

const APP_WORKSPACE_ROUTE_PREFIX = '/app/workspace';

export const RESOURCE_EDITOR_TYPE = createEnum([
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'pdf', key: 'PDF', label: 'PDF' },
  { value: 'doc', key: 'DOC', label: 'Word' },
  { value: 'docx', key: 'DOCX', label: 'Word' },
  { value: 'ppt', key: 'PPT', label: '演示文稿' },
  { value: 'pptx', key: 'PPTX', label: '演示文稿' },
  { value: 'xls', key: 'XLS', label: '表格' },
  { value: 'xlsx', key: 'XLSX', label: '表格' },
  { value: 'skill', key: 'SKILL', label: '技能' },
  { value: 'agent', key: 'AGENT', label: '智能体' },
  { value: 'drawio', key: 'DRAWIO', label: 'DrawIO' },
  { value: 'unknown', key: 'UNKNOWN', label: '未知资源' },
] as const);

export type ResourceEditorType = EnumValue<typeof RESOURCE_EDITOR_TYPE>;

const DOCUMENT_EDITOR_TYPES = new Set<ResourceEditorType>([
  RESOURCE_EDITOR_TYPE.PDF,
  RESOURCE_EDITOR_TYPE.DOC,
  RESOURCE_EDITOR_TYPE.DOCX,
  RESOURCE_EDITOR_TYPE.PPT,
  RESOURCE_EDITOR_TYPE.PPTX,
  RESOURCE_EDITOR_TYPE.XLS,
  RESOURCE_EDITOR_TYPE.XLSX,
]);

const EDITOR_TYPE_VALUES = new Set<string>(RESOURCE_EDITOR_TYPE.options.map((item) => item.value));

const normalizeResourceTypeToken = (value?: string): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const readExtension = (resourceName?: string): string | undefined => {
  const trimmed = resourceName?.trim();
  if (!trimmed) return undefined;
  const match = /\.([a-z0-9]+)$/i.exec(trimmed);
  return match?.[1]?.toLowerCase();
};

const resolveEditorTypeFromName = (resourceName?: string): ResourceEditorType | undefined => {
  const extension = readExtension(resourceName);
  if (!extension || !EDITOR_TYPE_VALUES.has(extension)) return undefined;
  return extension as ResourceEditorType;
};

export const normalizeResourceEditorType = (
  editorType?: string
): ResourceEditorType | undefined => {
  const normalized = normalizeResourceTypeToken(editorType);
  if (!normalized || !EDITOR_TYPE_VALUES.has(normalized)) return undefined;
  return normalized as ResourceEditorType;
};

export const isDocumentEditorType = (editorType?: string): boolean => {
  const normalized = normalizeResourceEditorType(editorType);
  return normalized != null && DOCUMENT_EDITOR_TYPES.has(normalized);
};

export const resolveResourceEditorType = (params: {
  resourceType?: string;
  resourceName?: string;
}): ResourceEditorType => {
  const normalizedType = normalizeResourceTypeToken(params.resourceType);
  const editorTypeFromName = resolveEditorTypeFromName(params.resourceName);

  if (normalizedType === RESOURCE_EDITOR_TYPE.UNKNOWN) {
    return editorTypeFromName ?? RESOURCE_EDITOR_TYPE.UNKNOWN;
  }

  if (normalizedType && EDITOR_TYPE_VALUES.has(normalizedType)) {
    return normalizedType as ResourceEditorType;
  }

  if (editorTypeFromName) return editorTypeFromName;

  return RESOURCE_EDITOR_TYPE.UNKNOWN;
};

export const buildWorkspaceResourcePath = (
  editorType: ResourceEditorType,
  resourceId: string
): string => {
  return `${APP_WORKSPACE_ROUTE_PREFIX}/${editorType}/${encodeURIComponent(resourceId)}`;
};

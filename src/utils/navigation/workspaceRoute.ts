import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

const APP_WORKSPACE_ROUTE_PREFIX = '/app/workspace';

export const WORKSPACE_RESOURCE_TYPE = createEnum([
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'drawio', key: 'DRAWIO', label: 'DrawIO' },
  { value: 'file', key: 'FILE', label: '文件' },
  { value: 'skill', key: 'SKILL', label: '技能' },
  { value: 'agent', key: 'AGENT', label: '智能体' },
] as const);

export type WorkspaceResourceType = EnumValue<typeof WORKSPACE_RESOURCE_TYPE>;

export const WORKSPACE_VIEWER = createEnum([
  { value: 'office', key: 'OFFICE', label: 'Office' },
  { value: 'pdfPreview', key: 'PDF_PREVIEW', label: 'PDF 预览' },
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'drawio', key: 'DRAWIO', label: 'DrawIO' },
  { value: 'skill', key: 'SKILL', label: '技能' },
] as const);

export type WorkspaceViewer = EnumValue<typeof WORKSPACE_VIEWER>;

export interface WorkspaceOpenTarget {
  resourceId?: string;
  resourceType: WorkspaceResourceType;
  viewer?: WorkspaceViewer;
}

export interface WorkspaceResourceResolveParams {
  resourceType?: string;
  resourceName?: string;
}

export interface WorkspaceViewerResolveParams extends WorkspaceResourceResolveParams {
  viewer?: string;
}

const DOCUMENT_EXTENSION_VALUES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;
const OFFICE_EXTENSION_VALUES = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;

type DocumentExtension = (typeof DOCUMENT_EXTENSION_VALUES)[number];
type OfficeExtension = (typeof OFFICE_EXTENSION_VALUES)[number];

const DOCUMENT_EXTENSIONS = new Set<string>(DOCUMENT_EXTENSION_VALUES);
const OFFICE_EXTENSIONS = new Set<string>(OFFICE_EXTENSION_VALUES);

const normalizeToken = (value?: string): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const readExtension = (resourceName?: string): string | undefined => {
  const trimmed = resourceName?.trim();
  if (!trimmed) return undefined;
  const match = /\.([a-z0-9]+)$/i.exec(trimmed);
  return match?.[1]?.toLowerCase();
};

const isDocumentExtension = (value?: string): value is DocumentExtension =>
  value != null && DOCUMENT_EXTENSIONS.has(value);

const isOfficeExtension = (value?: string): value is OfficeExtension =>
  value != null && OFFICE_EXTENSIONS.has(value);

export const normalizeWorkspaceResourceType = (
  resourceType?: string
): WorkspaceResourceType | undefined => {
  const normalized = normalizeToken(resourceType);
  if (!normalized) return undefined;

  if (normalized === WORKSPACE_RESOURCE_TYPE.NOTE) return WORKSPACE_RESOURCE_TYPE.NOTE;
  if (normalized === WORKSPACE_RESOURCE_TYPE.DRAWIO) return WORKSPACE_RESOURCE_TYPE.DRAWIO;
  if (normalized === WORKSPACE_RESOURCE_TYPE.FILE) return WORKSPACE_RESOURCE_TYPE.FILE;
  if (normalized === WORKSPACE_RESOURCE_TYPE.SKILL) return WORKSPACE_RESOURCE_TYPE.SKILL;
  if (normalized === WORKSPACE_RESOURCE_TYPE.AGENT) return WORKSPACE_RESOURCE_TYPE.AGENT;

  if (isDocumentExtension(normalized)) return WORKSPACE_RESOURCE_TYPE.FILE;

  return undefined;
};

export const resolveWorkspaceResourceType = ({
  resourceType,
  resourceName,
}: WorkspaceResourceResolveParams): WorkspaceResourceType => {
  const normalizedType = normalizeWorkspaceResourceType(resourceType);
  if (normalizedType) return normalizedType;

  const extension = readExtension(resourceName);
  if (isDocumentExtension(extension)) return WORKSPACE_RESOURCE_TYPE.FILE;

  return WORKSPACE_RESOURCE_TYPE.FILE;
};

export const normalizeWorkspaceViewer = (viewer?: string): WorkspaceViewer | undefined => {
  const normalized = normalizeToken(viewer);
  if (!normalized) return undefined;

  if (normalized === WORKSPACE_VIEWER.OFFICE) return WORKSPACE_VIEWER.OFFICE;
  if (
    normalized === 'pdf' ||
    normalized === 'pdfpreview' ||
    normalized === 'pdf-preview' ||
    normalized === 'pdf_preview'
  ) {
    return WORKSPACE_VIEWER.PDF_PREVIEW;
  }
  if (normalized === WORKSPACE_VIEWER.NOTE) return WORKSPACE_VIEWER.NOTE;
  if (normalized === WORKSPACE_VIEWER.DRAWIO) return WORKSPACE_VIEWER.DRAWIO;
  if (normalized === WORKSPACE_VIEWER.SKILL) return WORKSPACE_VIEWER.SKILL;

  if (isOfficeExtension(normalized)) return WORKSPACE_VIEWER.OFFICE;

  return undefined;
};

export const resolveWorkspaceViewer = ({
  resourceType,
  resourceName,
  viewer,
}: WorkspaceViewerResolveParams): WorkspaceViewer | undefined => {
  const explicitViewer = normalizeWorkspaceViewer(viewer);
  if (explicitViewer) return explicitViewer;

  const normalizedType = normalizeWorkspaceResourceType(resourceType);
  if (normalizedType === WORKSPACE_RESOURCE_TYPE.NOTE) return WORKSPACE_VIEWER.NOTE;
  if (normalizedType === WORKSPACE_RESOURCE_TYPE.DRAWIO) return WORKSPACE_VIEWER.DRAWIO;
  if (normalizedType === WORKSPACE_RESOURCE_TYPE.SKILL) return WORKSPACE_VIEWER.SKILL;

  if (normalizedType !== WORKSPACE_RESOURCE_TYPE.FILE) return undefined;

  const resourceTypeToken = normalizeToken(resourceType);
  const extension = isDocumentExtension(resourceTypeToken)
    ? resourceTypeToken
    : readExtension(resourceName);

  if (extension === 'pdf') return WORKSPACE_VIEWER.PDF_PREVIEW;
  if (isOfficeExtension(extension)) return WORKSPACE_VIEWER.OFFICE;

  return undefined;
};

export const isWorkspaceViewerCompatible = (
  resourceType?: WorkspaceResourceType,
  viewer?: WorkspaceViewer
): boolean => {
  if (!resourceType) return false;
  if (!viewer) return resourceType === WORKSPACE_RESOURCE_TYPE.FILE;

  if (resourceType === WORKSPACE_RESOURCE_TYPE.NOTE) return viewer === WORKSPACE_VIEWER.NOTE;
  if (resourceType === WORKSPACE_RESOURCE_TYPE.DRAWIO) return viewer === WORKSPACE_VIEWER.DRAWIO;
  if (resourceType === WORKSPACE_RESOURCE_TYPE.SKILL) return viewer === WORKSPACE_VIEWER.SKILL;
  if (resourceType === WORKSPACE_RESOURCE_TYPE.FILE) {
    return viewer === WORKSPACE_VIEWER.PDF_PREVIEW || viewer === WORKSPACE_VIEWER.OFFICE;
  }

  return false;
};

export const resolveLegacyEditorTypeForWorkspace = (
  resourceType?: WorkspaceResourceType,
  viewer?: WorkspaceViewer
): string | undefined => {
  if (resourceType === WORKSPACE_RESOURCE_TYPE.FILE) {
    if (viewer === WORKSPACE_VIEWER.PDF_PREVIEW) return 'pdf';
    if (viewer === WORKSPACE_VIEWER.OFFICE) return 'office';
    return 'file';
  }
  return resourceType;
};

export const buildWorkspaceResourcePath = ({
  resourceType,
  resourceId,
  viewer,
}: WorkspaceOpenTarget): string => {
  const basePath = resourceId
    ? `${APP_WORKSPACE_ROUTE_PREFIX}/${resourceType}/${encodeURIComponent(resourceId)}`
    : `${APP_WORKSPACE_ROUTE_PREFIX}/${resourceType}`;
  if (!viewer) return basePath;

  const search = new URLSearchParams();
  search.set('viewer', viewer);
  return `${basePath}?${search.toString()}`;
};

export const buildWorkspaceResourcePathWithSearch = (
  target: WorkspaceOpenTarget,
  currentSearch?: string
): string => {
  const basePath = buildWorkspaceResourcePath(target);
  const [pathname, targetSearch = ''] = basePath.split('?');
  const search = new URLSearchParams(currentSearch);
  const targetParams = new URLSearchParams(targetSearch);

  search.delete('viewer');
  targetParams.forEach((value, key) => {
    search.set(key, value);
  });

  const nextSearch = search.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
};

export const resolveLegacyWorkspaceRedirectTarget = ({
  resourceType,
  resourceId,
  viewer,
}: {
  resourceType?: string;
  resourceId?: string;
  viewer?: string;
}): WorkspaceOpenTarget | undefined => {
  if (!resourceId) return undefined;

  const rawResourceType = resourceType?.trim();
  const normalizedToken = normalizeToken(resourceType);
  const normalizedType = normalizeWorkspaceResourceType(resourceType);
  if (!normalizedToken || !normalizedType) return undefined;

  const normalizedViewer = normalizeWorkspaceViewer(viewer);
  const rawViewer = viewer?.trim();
  const shouldRedirectResourceType = rawResourceType != null && rawResourceType !== normalizedType;
  const shouldRedirectViewer =
    rawViewer != null && normalizedViewer != null && rawViewer !== normalizedViewer;

  if (!shouldRedirectResourceType && !shouldRedirectViewer) return undefined;

  return {
    resourceType: normalizedType,
    resourceId,
    viewer: resolveWorkspaceViewer({ resourceType, viewer }),
  };
};

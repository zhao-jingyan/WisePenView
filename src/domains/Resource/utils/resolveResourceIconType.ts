import type { ResourceIconType } from '../entity/resource';

const EXTENSION_ICON_TYPE_MAP: Record<string, ResourceIconType> = {
  doc: 'doc',
  docx: 'doc',
  pdf: 'pdf',
  ppt: 'ppt',
  pptx: 'ppt',
  xls: 'xls',
  xlsx: 'xls',
  csv: 'xls',
  md: 'md',
  markdown: 'md',
};

const RESOURCE_TYPE_ICON_TYPE_MAP: Record<string, ResourceIconType> = {
  note: 'note',
  drawio: 'drawio',
  skill: 'skill',
  agent: 'agent',
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  ppt: 'ppt',
  pptx: 'ppt',
  xls: 'xls',
  xlsx: 'xls',
  md: 'md',
  markdown: 'md',
  file: 'file',
  document: 'file',
};

const readExtension = (name?: string): string | undefined => {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  const match = /\.([a-z0-9]+)$/i.exec(trimmed);
  return match?.[1]?.toLowerCase();
};

export const resolveResourceIconType = (params: {
  resourceType?: string;
  resourceName?: string;
}): ResourceIconType => {
  const rawType = params.resourceType?.trim().toLowerCase();
  const typeIcon = rawType ? RESOURCE_TYPE_ICON_TYPE_MAP[rawType] : undefined;

  if (typeIcon === 'skill' || typeIcon === 'agent') return typeIcon;

  const extension = readExtension(params.resourceName);
  const extensionIcon = extension ? EXTENSION_ICON_TYPE_MAP[extension] : undefined;
  return extensionIcon ?? typeIcon ?? 'file';
};

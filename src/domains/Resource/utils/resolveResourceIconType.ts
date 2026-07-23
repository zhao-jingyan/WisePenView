import type { ResourceIconType } from '../entity/resource';

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

export const resolveResourceIconType = (resourceType?: string): ResourceIconType => {
  const rawType = resourceType?.trim().toLowerCase();
  const typeIcon = rawType ? RESOURCE_TYPE_ICON_TYPE_MAP[rawType] : undefined;
  return typeIcon ?? 'file';
};

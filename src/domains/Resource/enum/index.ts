import { createEnum } from '@/utils/enum';

/** 资源类型 */
export const RESOURCE = createEnum([
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'file', key: 'FILE', label: '文件' },
] as const);

export const RESOURCE_TYPE = RESOURCE.values;

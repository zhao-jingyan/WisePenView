/**
 * 文档上传与后端 DocumentConstants 对齐（扩展名白名单、体积上限）。
 */
export const DOCUMENT_MAX_FILE_BYTES = 100 * 1024 * 1024;

/** 小写扩展名，不含点 */
export const DOCUMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
] as const;

export type DocumentAllowedExtension = (typeof DOCUMENT_ALLOWED_EXTENSIONS)[number];

/** 文档资源类型（与后端 ResourceType 枚举序列化值对齐） */
export const DOCUMENT_RESOURCE_TYPES = [...DOCUMENT_ALLOWED_EXTENSIONS, 'unknown'] as const;

export type DocumentResourceType = (typeof DOCUMENT_RESOURCE_TYPES)[number];

/** 文档处理状态（与后端 syncPendingDocStatus 返回的 status 字符串对齐） */
export const DOCUMENT_PROCESS_STATUS = {
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  CONVERTING_AND_PARSING: 'CONVERTING_AND_PARSING',
  REGISTERING_RES: 'REGISTERING_RES',
  READY: 'READY',
  TRANSFER_TIMEOUT: 'TRANSFER_TIMEOUT',
  REGISTERING_RES_TIMEOUT: 'REGISTERING_RES_TIMEOUT',
  FAILED: 'FAILED',
} as const;

export type DocumentProcessStatus =
  (typeof DOCUMENT_PROCESS_STATUS)[keyof typeof DOCUMENT_PROCESS_STATUS];

export const DOCUMENT_PROCESS_STATUS_LABELS: Record<DocumentProcessStatus, string> = {
  [DOCUMENT_PROCESS_STATUS.UPLOADING]: '上传中',
  [DOCUMENT_PROCESS_STATUS.UPLOADED]: '上传完成',
  [DOCUMENT_PROCESS_STATUS.CONVERTING_AND_PARSING]: '处理中',
  [DOCUMENT_PROCESS_STATUS.REGISTERING_RES]: '资源注册中',
  [DOCUMENT_PROCESS_STATUS.READY]: '准备就绪',
  [DOCUMENT_PROCESS_STATUS.TRANSFER_TIMEOUT]: '上传超时',
  [DOCUMENT_PROCESS_STATUS.REGISTERING_RES_TIMEOUT]: '资源注册超时',
  [DOCUMENT_PROCESS_STATUS.FAILED]: '失败',
};

// 终态集合
export const DOCUMENT_TERMINAL_STATUS = [
  DOCUMENT_PROCESS_STATUS.READY,
  DOCUMENT_PROCESS_STATUS.TRANSFER_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.FAILED,
] as const;

const DOCUMENT_TERMINAL_STATUS_SET = new Set<string>(DOCUMENT_TERMINAL_STATUS);

export const DOCUMENT_RETRYABLE_STATUS = [
  DOCUMENT_PROCESS_STATUS.TRANSFER_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.FAILED,
] as const;

const DOCUMENT_RETRYABLE_STATUS_SET = new Set<string>(DOCUMENT_RETRYABLE_STATUS);

export const DOCUMENT_CANCELABLE_STATUS = [
  DOCUMENT_PROCESS_STATUS.UPLOADING,
  DOCUMENT_PROCESS_STATUS.UPLOADED,
  DOCUMENT_PROCESS_STATUS.REGISTERING_RES,
  DOCUMENT_PROCESS_STATUS.TRANSFER_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.REGISTERING_RES_TIMEOUT,
  DOCUMENT_PROCESS_STATUS.FAILED,
] as const;

const DOCUMENT_CANCELABLE_STATUS_SET = new Set<string>(DOCUMENT_CANCELABLE_STATUS);

export const getDocumentStatusLabel = (status: string): string => {
  return DOCUMENT_PROCESS_STATUS_LABELS[status as DocumentProcessStatus] ?? status;
};

export const isDocumentTerminalStatus = (status: string): boolean => {
  return DOCUMENT_TERMINAL_STATUS_SET.has(status);
};

export const isDocumentRetryableStatus = (status: string): boolean => {
  return DOCUMENT_RETRYABLE_STATUS_SET.has(status);
};

export const isDocumentCancelableStatus = (status: string): boolean => {
  return DOCUMENT_CANCELABLE_STATUS_SET.has(status);
};

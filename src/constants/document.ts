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

/** 文档处理状态，对应后端 DocumentStatusEnum 枚举 */
export const DOCUMENT_PROCESS_STATUS = {
  UPLOADING: 0,
  UPLOADED: 1,
  CONVERTING_AND_PARSING: 2,
  REGISTERING_RES: 3,
  READY: 4,
  TRANSFER_TIMEOUT: -1, // 上传超时，OSS 回调超时未达
  REGISTERING_RES_TIMEOUT: -2, // 资源登记超时
  FAILED: -3, // 失败
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

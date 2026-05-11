import { createEnum } from '@/utils/enum';

/** 文档处理状态（与后端 syncPendingDocStatus 返回的 status 字符串对齐） */
export const DOCUMENT_PROCESS = createEnum([
  { value: 'UPLOADING', key: 'UPLOADING', label: '上传中' },
  { value: 'UPLOADED', key: 'UPLOADED', label: '上传完成' },
  { value: 'CONVERTING_AND_PARSING', key: 'CONVERTING_AND_PARSING', label: '处理中' },
  { value: 'REGISTERING_RES', key: 'REGISTERING_RES', label: '资源注册中' },
  { value: 'READY', key: 'READY', label: '准备就绪' },
  { value: 'TRANSFER_TIMEOUT', key: 'TRANSFER_TIMEOUT', label: '上传超时' },
  { value: 'REGISTERING_RES_TIMEOUT', key: 'REGISTERING_RES_TIMEOUT', label: '资源注册超时' },
  { value: 'FAILED', key: 'FAILED', label: '失败' },
] as const);

export const DOCUMENT_PROCESS_STATUS = DOCUMENT_PROCESS.values;
export type DocumentProcessStatus = (typeof DOCUMENT_PROCESS.options)[number]['value'];

export const DOCUMENT_PROCESS_STATUS_LABELS: Record<DocumentProcessStatus, string> =
  DOCUMENT_PROCESS.labels;

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

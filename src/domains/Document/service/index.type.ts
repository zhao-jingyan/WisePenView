import type { ResourceItem } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import type { Config } from '@onlyoffice/doceditor-types';

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

/** `POST /document/initDocUpload` 请求体，与后端 DocumentUploadInitRequest 一致 */
export interface DocumentUploadInitRequestBody {
  filename: string;
  extension: string;
  md5: string;
  expectedSize: number;
}

/** `POST /document/initDocUpload` 的 `data`，与后端 DocumentUploadInitResponse 一致 */
export interface DocumentUploadInitResponse {
  documentId: string;
  putUrl: string | null;
  callbackHeader: string | null;
  objectKey: string;
  flashUploaded: boolean;
}

interface DocumentUploadMeta {
  documentName: string;
  uploaderId: string | null;
  fileType: string;
  size: number;
}

interface PendingDocumentStatus {
  status: string;
  errorMessage?: string | null;
}

/** 文档元信息（对齐后端 DocumentInfoBase） */
export interface DocMetaInfo {
  uploadMeta: DocumentUploadMeta;
  documentStatus: PendingDocumentStatus;
  maxPreviewPages: number | null;
  version?: number;
}

export interface PendingDocItem extends DocMetaInfo {
  /** 部分接口实现可能不返回该字段；缺失时前端仅展示，不允许重试/取消/sync */
  documentId?: string;
}

export interface DocDisplayInfoResponse {
  docMetaInfo: DocMetaInfo;
  resourceInfo: ResourceItem;
  authorsDisplay?: Record<string, UserDisplayBase>;
}

export type OnlyOfficeEditorConfig = Config;

export interface OnlyOfficeEditorConfigResponse {
  sessionId?: string;
  config?: OnlyOfficeEditorConfig | null;
}

/** DocumentService：文档上传、重试转换、删除（路径与当前后端 DocumentController 一致） */
export interface IDocumentService {
  /** 计算 MD5 → 初始化上传 → 非秒传时 PUT 至 OSS，返回 documentId（即 resourceId） */
  uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult>;
  /** 仅 FAILED 状态可调用 */
  retryConvert(documentId: string): Promise<void>;
  /** 取消上传或删除文档 */
  deleteDocument(documentId: string): Promise<void>;
  /** 拉取待处理文档队列 */
  listPendingDocs(): Promise<PendingDocItem[]>;
  /** 触发单条文档状态同步 */
  syncPendingDocStatus(documentId: string): Promise<void>;
  /** 重试待处理文档 */
  retryPendingDoc(documentId: string): Promise<void>;
  /** 取消待处理文档 */
  cancelPendingDoc(documentId: string): Promise<void>;
  /** 获取文档详情信息（用于预览页展示） */
  getDocInfo(resourceId: string): Promise<DocDisplayInfoResponse>;
  /** 获取 ONLYOFFICE 编辑器初始化配置 */
  getOnlyOfficeEditorConfig(resourceId: string): Promise<OnlyOfficeEditorConfigResponse>;
}

export interface UploadDocumentParams {
  file: File;
  /** 初始化上传成功后触发，供上传队列提前关联后端任务 */
  onUploadInitialized?: (payload: UploadDocumentInitializedPayload) => void;
  /** MD5 分块计算进度 0–100 */
  onHashProgress?: (percent: number) => void;
  /** 直传 OSS 进度 0–100（秒传时不触发） */
  onUploadProgress?: (percent: number) => void;
}

export interface UploadDocumentInitializedPayload {
  documentId: string;
  objectKey: string;
  flashUploaded: boolean;
}

export interface UploadDocumentResult {
  documentId: string;
  objectKey: string;
  flashUploaded: boolean;
}

import { DocumentApi } from '@/apis/document';
import { ResourceItemApi } from '@/apis/resource';
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_MAX_FILE_BYTES,
  type DocumentAllowedExtension,
} from '@/constants/document';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import type {
  DocDisplayInfoResponse,
  DocumentUploadInitRequestBody,
  DocumentUploadInitResponse,
  IDocumentService,
  PendingDocItem,
  UploadDocumentParams,
  UploadDocumentResult,
} from './index.type';

const parseExtension = (fileName: string): string => {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) {
    throw new Error('文件名须包含扩展名');
  }
  return fileName.slice(i + 1).toLowerCase();
};

const ALLOWED_EXT_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);

const isAllowedExtension = (ext: string): ext is DocumentAllowedExtension =>
  ALLOWED_EXT_SET.has(ext);

const assertDocumentUploadAllowed = (file: File): void => {
  if (file.size > DOCUMENT_MAX_FILE_BYTES) {
    throw new Error('文件大小超过 100MB 限制');
  }
  const ext = parseExtension(file.name);
  if (!isAllowedExtension(ext)) {
    throw new Error('不支持的文件类型，仅支持 doc/docx/ppt/pptx/xls/xlsx/pdf');
  }
};

const initUpload = async (
  body: DocumentUploadInitRequestBody
): Promise<DocumentUploadInitResponse> => {
  const res = await DocumentApi.uploadDoc(body);
  if (res == null) {
    throw new Error('上传初始化无数据');
  }
  return res;
};

const uploadDocument = async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
  const { file, onHashProgress, onUploadProgress } = params;
  assertDocumentUploadAllowed(file);

  const md5 = await computeFileMd5(file, onHashProgress);
  const extension = parseExtension(file.name);

  const init = await initUpload({
    filename: file.name,
    extension,
    md5,
    expectedSize: file.size,
  });

  if (init.flashUploaded) {
    return {
      documentId: init.documentId,
      objectKey: init.objectKey,
      flashUploaded: true,
    };
  }

  if (
    init.putUrl == null ||
    init.putUrl === '' ||
    init.callbackHeader == null ||
    init.callbackHeader === ''
  ) {
    throw new Error('上传初始化未返回有效的直传地址');
  }

  await putOssPresignedUrl({
    putUrl: init.putUrl,
    body: file,
    callbackHeader: init.callbackHeader,
    onProgress: onUploadProgress,
  });

  return {
    documentId: init.documentId,
    objectKey: init.objectKey,
    flashUploaded: false,
  };
};

const retryConvert = async (documentId: string): Promise<void> => {
  await DocumentApi.retryDocConvert({ documentId });
};

const deleteDocument = async (documentId: string): Promise<void> => {
  await ResourceItemApi.removeResources({ resourceIds: [documentId] });
};

const listPendingDocs = async (): Promise<PendingDocItem[]> => {
  return (await DocumentApi.listPendingDocs()) ?? [];
};

const syncPendingDocStatus = async (documentId: string): Promise<void> => {
  await DocumentApi.syncDocStatus({ documentId });
};

const retryPendingDoc = async (documentId: string): Promise<void> => {
  await DocumentApi.retryDocProcess({ documentId });
};

const cancelPendingDoc = async (documentId: string): Promise<void> => {
  await DocumentApi.cancelDocProcess({ documentId });
};

const getDocInfo = async (resourceId: string): Promise<DocDisplayInfoResponse> => {
  return DocumentApi.getDocInfo({ resourceId }) as Promise<DocDisplayInfoResponse>;
};
export const createDocumentServices = (): IDocumentService => ({
  uploadDocument,
  retryConvert,
  deleteDocument,
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
});

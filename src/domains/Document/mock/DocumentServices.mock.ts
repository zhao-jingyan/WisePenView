import type {
  DocDisplayInfoResponse,
  IDocumentService,
  OnlyOfficeEditorConfigResponse,
  PendingDocItem,
  UploadDocumentParams,
  UploadDocumentResult,
} from '@/domains/Document';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadDocument = async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
  params.onHashProgress?.(100);
  await delay(100);
  const name = params.file.name.replace(/\s+/g, '-');
  const now = Date.now();
  const documentId = `mock-doc-${now}`;
  const objectKey = `mock/private/doc/${now}-${name}`;
  params.onUploadInitialized?.({
    documentId,
    objectKey,
    flashUploaded: false,
  });
  params.onUploadProgress?.(35);
  await delay(100);
  params.onUploadProgress?.(75);
  await delay(100);
  params.onUploadProgress?.(100);
  return {
    documentId,
    objectKey,
    flashUploaded: false,
  };
};

const retryConvert = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const deleteDocument = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const listPendingDocs = async (): Promise<PendingDocItem[]> => {
  await delay(200);
  return [];
};

const syncPendingDocStatus = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const retryPendingDoc = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const cancelPendingDoc = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const getDocInfo = async (documentId: string): Promise<DocDisplayInfoResponse> => {
  await delay(200);
  return {
    docMetaInfo: {
      uploadMeta: {
        documentName: `mock-${documentId}.pdf`,
        uploaderId: 1,
        fileType: 'pdf',
        size: 1024 * 1024 * 2,
      },
      documentStatus: {
        status: 'SUCCESS',
      },
      maxPreviewPages: 20,
    },
    resourceInfo: {
      resourceId: documentId,
      resourceName: `mock-${documentId}.pdf`,
      ownerInfo: {
        nickname: 'Mock User',
        avatar: '',
        identityType: 0,
      },
      resourceType: 'file',
    },
  };
};

const getOnlyOfficeEditorConfig = async (
  resourceId: string
): Promise<OnlyOfficeEditorConfigResponse> => {
  await delay(200);
  return {
    sessionId: `mock-office-${resourceId}`,
    config: null,
  };
};

export const DocumentServicesMock: IDocumentService = {
  uploadDocument,
  retryConvert,
  deleteDocument,
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
  getOnlyOfficeEditorConfig,
};

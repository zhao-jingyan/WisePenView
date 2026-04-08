import type {
  DocDisplayInfoResponse,
  IDocumentService,
  PendingDocItem,
  UploadDocumentParams,
  UploadDocumentResult,
} from '@/services/Document';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadDocument = async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
  await delay(400);
  const name = params.file.name.replace(/\s+/g, '-');
  return {
    documentId: `mock-doc-${Date.now()}`,
    objectKey: `mock/private/doc/${Date.now()}-${name}`,
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

export const DocumentServicesMock: IDocumentService = {
  uploadDocument,
  retryConvert,
  deleteDocument,
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
};

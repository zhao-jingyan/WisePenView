import type {
  DocDisplayInfoResponse,
  IDocumentService,
  OnlyOfficeEditorConfigResponse,
  PendingDocItem,
} from '@/domains/Document';
import { DOCUMENT_PROCESS } from '@/domains/Document';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadDocument: IDocumentService['uploadDocument'] = async (params) => {
  await delay(100);
  const now = Date.now();
  const documentId = `mock-doc-${now}`;
  params.onUploadInitialized?.({
    documentId,
    flashUploaded: false,
  });
  params.onUploadProgress?.(35);
  await delay(100);
  params.onUploadProgress?.(75);
  await delay(100);
  params.onUploadProgress?.(100);
  return documentId;
};

const listPendingDocs = async (): Promise<PendingDocItem[]> => {
  await delay(200);
  return [];
};

const syncPendingDocStatus: IDocumentService['syncPendingDocStatus'] = async (_documentId) => {
  await delay(200);
  return { status: DOCUMENT_PROCESS.READY };
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
        uploaderId: '1',
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
      resourceType: 'pdf',
    },
  };
};

const forkDocument: IDocumentService['forkDocument'] = async () => {
  await delay(200);
  return `mock-doc-copy-${Date.now()}`;
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
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
  forkDocument,
  getOnlyOfficeEditorConfig,
};

import { apiGet, apiPost } from '@/apis/request';
import type {
  DocumentIdApiRequest,
  GetDocInfoApiRequest,
  GetDocInfoApiResponse,
  ListPendingDocsApiResponse,
  UploadDocApiRequest,
  UploadDocApiResponse,
} from './DocumentApi.type';

function uploadDoc(req: UploadDocApiRequest): Promise<UploadDocApiResponse> {
  return apiPost('/document/uploadDoc', req, { timeout: 30_000 });
}

function retryDocConvert(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/retryDocConvert', null, { params: req });
}

function listPendingDocs(): Promise<ListPendingDocsApiResponse> {
  return apiGet('/document/listPendingDocs');
}

function syncDocStatus(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/syncDocStatus', null, { params: req });
}

function retryDocProcess(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/retryDocProcess', null, { params: req });
}

function cancelDocProcess(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/cancelDocProcess', null, { params: req });
}

function getDocInfo(req: GetDocInfoApiRequest): Promise<GetDocInfoApiResponse> {
  return apiGet('/document/getDocInfo', { params: req });
}

export const DocumentApi = {
  uploadDoc,
  retryDocConvert,
  listPendingDocs,
  syncDocStatus,
  retryDocProcess,
  cancelDocProcess,
  getDocInfo,
};

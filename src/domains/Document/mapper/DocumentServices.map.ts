import { normalizeResourceItem } from '@/domains/Resource';
import type {
  GetDocInfoApiResponse,
  ListPendingDocsApiResponse,
  OnlyOfficeEditorConfigApiResponse,
} from '../apis/DocumentApi.type';
import type {
  DocDisplayInfoResponse,
  OnlyOfficeEditorConfigResponse,
  PendingDocItem,
} from '../service/index.type';

const mapListPendingDocsFromApi = (data: ListPendingDocsApiResponse | null): PendingDocItem[] => {
  // 兼容：旧实现可能返回 null
  return data ?? [];
};

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => {
  return {
    docMetaInfo: data.docMetaInfo,
    resourceInfo: normalizeResourceItem(data.resourceInfo),
  };
};

const mapOnlyOfficeEditorConfigFromApi = (
  data: OnlyOfficeEditorConfigApiResponse
): OnlyOfficeEditorConfigResponse => {
  return {
    // fallback：旧 ONLYOFFICE 配置接口可能缺少 sessionId，页面 key 使用稳定占位。
    sessionId: data.sessionId ?? 'session',
    config: data.config,
    documentServerPublicUrl: data.documentServerPublicUrl,
  };
};

export const DocumentServicesMap = {
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
  mapOnlyOfficeEditorConfigFromApi,
};

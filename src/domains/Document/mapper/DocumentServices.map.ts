import { normalizeResourceItem } from '@/domains/Resource/mapper/ResourceServices.map';
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

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => ({
  ...data,
  resourceInfo: normalizeResourceItem(data.resourceInfo),
});

const mapOnlyOfficeEditorConfigFromApi = (
  data: OnlyOfficeEditorConfigApiResponse
): OnlyOfficeEditorConfigResponse => ({
  ...data,
  // fallback：旧 ONLYOFFICE 配置接口可能缺少 sessionId，页面 key 使用稳定占位。
  sessionId: data.sessionId ?? 'session',
});

export const DocumentServicesMap = {
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
  mapOnlyOfficeEditorConfigFromApi,
};

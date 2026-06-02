import { normalizeResourceItem } from '@/utils/normalize/normalizeResourceItem';
import type { GetDocInfoApiResponse, ListPendingDocsApiResponse } from '../apis/DocumentApi.type';
import type { DocDisplayInfoResponse, PendingDocItem } from '../service/index.type';

const mapListPendingDocsFromApi = (data: ListPendingDocsApiResponse | null): PendingDocItem[] => {
  // fallback：待处理队列接口旧实现可能返回 null
  return data ?? [];
};

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => ({
  ...data,
  // 后端 Long 字段（readCount/likeCount）以字符串返回，统一在 domain 边界归一化为 number。
  resourceInfo: normalizeResourceItem(data.resourceInfo),
});

export const DocumentServicesMap = {
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
};

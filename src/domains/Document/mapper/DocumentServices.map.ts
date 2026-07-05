import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import type { GetDocInfoApiResponse, ListPendingDocsApiResponse } from '../apis/DocumentApi.type';
import type { DocDisplayInfoResponse, PendingDocItem } from '../service/index.type';

const mapListPendingDocsFromApi = (data: ListPendingDocsApiResponse | null): PendingDocItem[] => {
  // 兼容：旧实现可能返回 null
  return data ?? [];
};

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => ({
  ...data,
  resourceInfo: ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo),
});

export const DocumentServicesMap = {
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
};

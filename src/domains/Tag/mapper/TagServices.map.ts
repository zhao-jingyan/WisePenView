import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
} from '@/domains/Resource/apis/ResourceApi.type';
import { resourceActionsToApiKeys } from '@/domains/Tag';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import type { TagCreateRequest, TagTreeNode, TagUpdateRequest } from '../service/index.type';

const mapGetTagTreeRequest = (groupId?: string): GetTagTreeApiRequest | undefined => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  return normalizedGroupId
    ? {
        groupId: normalizedGroupId,
      }
    : undefined;
};

const mapTagTreeFromApi = (data: GetTagTreeApiResponse): TagTreeNode[] => data;

const mapAddTagRequest = (params: TagCreateRequest): AddTagApiRequest => ({
  ...params,
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapUpdateTagRequest = (params: TagUpdateRequest): ChangeTagApiRequest => ({
  ...params,
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapAddTagFromApi = (data: string): string => {
  // fallback：旧接口可能返回空 data，保持原有空串行为
  return data ?? '';
};

export const TagServicesMap = {
  mapGetTagTreeRequest,
  mapTagTreeFromApi,
  mapAddTagRequest,
  mapUpdateTagRequest,
  mapAddTagFromApi,
};

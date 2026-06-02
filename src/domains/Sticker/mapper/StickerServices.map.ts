import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  RemoveTagApiRequest,
  TagTreeResponse,
} from '@/domains/Resource/apis/ResourceApi.type';
import type {
  AddStickerRequest,
  DeleteStickerRequest,
  Sticker,
  UpdateStickerRequest,
} from '../service/index.type';

const mapStickerListFromApi = (data: TagTreeResponse[]): Sticker[] => {
  return data
    .filter((node) => {
      // fallback：缺失 tagName 时按空名称过滤
      const name = node.tagName ?? '';
      return name !== '' && !name.startsWith('/') && !name.startsWith('.');
    })
    .map((node) => ({ tagId: node.tagId, tagName: node.tagName }));
};

const mapAddStickerRequest = (params: AddStickerRequest): AddTagApiRequest => ({
  tagName: params.stickerName,
});

const mapUpdateStickerRequest = (params: UpdateStickerRequest): ChangeTagApiRequest => ({
  targetTagId: params.stickerId,
  tagName: params.stickerName,
});

const mapDeleteStickerRequest = (params: DeleteStickerRequest): RemoveTagApiRequest => ({
  targetTagId: params.stickerId,
});

export const StickerServicesMap = {
  mapStickerListFromApi,
  mapAddStickerRequest,
  mapUpdateStickerRequest,
  mapDeleteStickerRequest,
};

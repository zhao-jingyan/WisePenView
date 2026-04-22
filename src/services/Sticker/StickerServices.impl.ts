import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { IResourceService } from '@/services/Resource/index.type';
import type { TagTreeResponse } from '@/services/Tag/index.type';
import type {
  IStickerService,
  Sticker,
  AddStickerRequest,
  UpdateStickerRequest,
  DeleteStickerRequest,
  UpdateResourceStickersRequest,
} from './index.type';

export interface StickerServicesDeps {
  resourceService: IResourceService;
}

export const createStickerServices = (deps: StickerServicesDeps): IStickerService => {
  const { resourceService } = deps;

  const getStickerList = async (): Promise<Sticker[]> => {
    const res = (await Axios.get('/resource/tag/getTagTree')) as ApiResponse<TagTreeResponse[]>;
    checkResponse(res);
    // 过滤掉路径型（`/` 开头）与系统保留前缀（`.` 开头，例如 `.Trash`）
    const stickers = (res.data ?? [])
      .filter((node) => {
        const name = node.tagName ?? '';
        return name !== '' && !name.startsWith('/') && !name.startsWith('.');
      })
      .map((node) => ({ tagId: node.tagId, tagName: node.tagName }));
    return stickers;
  };

  const addSticker = async (params: AddStickerRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/addTag', {
      tagName: params.stickerName,
    })) as ApiResponse;
    checkResponse(res);
  };

  const updateSticker = async (params: UpdateStickerRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/changeTag', {
      targetTagId: params.stickerId,
      tagName: params.stickerName,
    })) as ApiResponse;
    checkResponse(res);
  };

  const deleteSticker = async (params: DeleteStickerRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/removeTag', {
      targetTagId: params.stickerId,
    })) as ApiResponse;
    checkResponse(res);
  };

  const updateResourceStickers = async (params: UpdateResourceStickersRequest): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: params.resourceId,
      tagIds: params.stickerIds,
    });
  };

  return {
    getStickerList,
    addSticker,
    updateSticker,
    deleteSticker,
    updateResourceStickers,
  };
};

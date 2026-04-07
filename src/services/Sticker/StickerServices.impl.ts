import { TagServicesImpl } from '@/services/Tag/TagServices.impl';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { TagTreeResponse } from '@/services/Tag/index.type';
import type {
  IStickerService,
  Sticker,
  AddStickerRequest,
  UpdateStickerRequest,
  DeleteStickerRequest,
  UpdateResourceStickersRequest,
} from './index.type';

const getStickerList = async (): Promise<Sticker[]> => {
  const res = (await Axios.get('/resource/tag/getTagTree')) as ApiResponse<TagTreeResponse[]>;
  checkResponse(res);
  // 过滤掉路径标签, 忽略叶子节点，同时简化数据结构
  const stickers = res.data
    .filter((node) => node.tagName !== '/' && node.tagName !== '.Trash')
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
  await ResourceServicesImpl.updateResourceTags({
    resourceId: params.resourceId,
    tagIds: params.stickerIds,
  });
};

export const StickerServicesImpl: IStickerService = {
  getStickerList,
  addSticker,
  updateSticker,
  deleteSticker,
  updateResourceStickers,
};

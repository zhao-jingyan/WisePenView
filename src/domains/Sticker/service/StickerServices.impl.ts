import type { IResourceService } from '@/domains/Resource';
import { ResourceTagApi } from '@/domains/Resource/apis/ResourceApi';
import { StickerServicesMap } from '../mapper/StickerServices.map';
import type {
  AddStickerRequest,
  DeleteStickerRequest,
  IStickerService,
  Sticker,
  UpdateResourceStickersRequest,
  UpdateStickerRequest,
} from './index.type';

export interface StickerServicesDeps {
  resourceService: IResourceService;
}

export const createStickerServices = (deps: StickerServicesDeps): IStickerService => {
  const { resourceService } = deps;

  const getStickerList = async (): Promise<Sticker[]> => {
    const data = await ResourceTagApi.getTagTree();
    return StickerServicesMap.mapStickerListFromApi(data);
  };

  const addSticker = async (params: AddStickerRequest): Promise<void> => {
    const payload = StickerServicesMap.mapAddStickerRequest(params);
    await ResourceTagApi.addTag(payload);
  };

  const updateSticker = async (params: UpdateStickerRequest): Promise<void> => {
    const payload = StickerServicesMap.mapUpdateStickerRequest(params);
    await ResourceTagApi.changeTag(payload);
  };

  const deleteSticker = async (params: DeleteStickerRequest): Promise<void> => {
    const payload = StickerServicesMap.mapDeleteStickerRequest(params);
    await ResourceTagApi.removeTag(payload);
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

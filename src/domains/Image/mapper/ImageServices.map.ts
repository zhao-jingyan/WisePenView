import type { ImageUploadApiRequest, ImageUploadApiResponse } from '../apis/ImageApi.type';
import type { ImageUploadRequest, ImageUploadResult } from '../service/index.type';
import { buildImagePublicUrl } from '../service/index.type';

const mapImageUploadRequest = (params: ImageUploadRequest): ImageUploadApiRequest => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('scene', params.scene);
  const hasBizTag = params.bizTag !== undefined && params.bizTag !== '';
  if (hasBizTag) {
    formData.append('bizTag', params.bizTag);
  }
  return formData;
};

const mapImageUploadFromApi = (record: ImageUploadApiResponse): ImageUploadResult => ({
  record,
  publicUrl: buildImagePublicUrl(record),
});

export const ImageServicesMap = {
  mapImageUploadRequest,
  mapImageUploadFromApi,
};

import type { ImageUploadApiRequest, ImageUploadApiResponse } from '../apis/ImageApi.type';
import type { ImageUploadRequest, ImageUploadResult } from '../service/index.type';
import { buildImagePublicUrl } from '../service/index.type';

const mapImageUploadRequest = (params: ImageUploadRequest): ImageUploadApiRequest => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('scene', params.scene);
  const bizTag = params.bizTag;
  if (bizTag !== undefined && bizTag !== '') {
    formData.append('bizTag', bizTag);
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

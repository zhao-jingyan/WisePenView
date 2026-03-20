import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type {
  IImageService,
  ImageStorageRecord,
  ImageUploadRequest,
  ImageUploadResult,
} from './index.type';
import { assertImageProxyUploadLimit, buildImagePublicUrl } from './index.type';

/** 图床上传可能略慢于普通 JSON 接口 */
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;

const uploadImage = async (params: ImageUploadRequest): Promise<ImageUploadResult> => {
  assertImageProxyUploadLimit(params.file);

  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('isPublic', String(params.isPublic ?? true));
  if (params.bizPath !== undefined && params.bizPath !== '') {
    formData.append('bizPath', params.bizPath);
  }

  const res = (await Axios.post('/storage/imageUpload', formData, {
    timeout: IMAGE_UPLOAD_TIMEOUT_MS,
  })) as ApiResponse<ImageStorageRecord>;

  checkResponse(res);
  const record = res.data;
  return {
    record,
    publicUrl: buildImagePublicUrl(record),
  };
};

export const ImageServicesImpl: IImageService = {
  uploadImage,
};

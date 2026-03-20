import type { IImageService, ImageUploadRequest, ImageUploadResult } from '@/services/Image';
import { assertImageProxyUploadLimit, buildImagePublicUrl } from '@/services/Image';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadImage = async (params: ImageUploadRequest): Promise<ImageUploadResult> => {
  assertImageProxyUploadLimit(params.file);
  await delay(300);
  const name = params.file.name.replace(/\s+/g, '-');
  const record = {
    fileId: Date.now(),
    domain: 'https://mock-cdn.example.com',
    objectKey: `public/images/mock/${Date.now()}-${name}`,
    md5: 'mock-md5',
    size: params.file.size,
  };
  return {
    record,
    publicUrl: buildImagePublicUrl(record),
  };
};

export const ImageServicesMock: IImageService = {
  uploadImage,
};

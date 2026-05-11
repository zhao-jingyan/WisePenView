export type ImageUploadApiRequest = FormData;

export interface ImageUploadApiResponse {
  fileId?: number;
  domain: string;
  objectKey: string;
  md5?: string;
  size?: number;
}

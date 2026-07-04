export const AssetResourceTypeEnum = {
  MD: 'MD',
  PYTHON_SCRIPT: 'PYTHON_SCRIPT',
  TEXT: 'TEXT',
  JSON: 'JSON',
  YAML: 'YAML',
  TOML: 'TOML',
} as const;

export type AssetResourceTypeEnum =
  (typeof AssetResourceTypeEnum)[keyof typeof AssetResourceTypeEnum];

export type SkillUploadStatus = 'UPLOADING' | 'AVAILABLE';
export type SkillVersionApiStatus = 'DRAFT' | 'PUBLISHED';

export interface SkillAssetApiInfo {
  id?: string;
  name?: string;
  path?: string;
  objectKey?: string;
  assetResourceType?: AssetResourceTypeEnum;
  uploadStatus?: SkillUploadStatus;
  size?: number;
}

export interface SkillResourceApiItem {
  resourceName?: string;
  resourceType?: string;
  ownerId?: string;
  preview?: string;
  size?: number;
  resourceId?: string;
}

export interface SkillInfoApiResponse {
  resourceInfo?: SkillResourceApiItem;
  skillInfo?: {
    name?: string;
    description?: string;
    version?: number;
    sourceType?: string;
  };
}

export interface SkillVersionBundleApiResponse {
  version?: number;
  status?: SkillVersionApiStatus;
  assets?: SkillAssetApiInfo[];
  resourceId?: string;
}

export interface CreateSkillData {
  body: {
    title: string;
    name?: string;
    description?: string;
    sourceType?: string;
  };
}

export interface GetSkillInfoData {
  query: {
    resourceId: string;
    targetVersion?: number;
  };
}

export interface GetSkillVersionBundleInfoData {
  query: {
    resourceId: string;
    version: number;
  };
}

export interface UpdateSkillInfoData {
  body: {
    resourceId?: string;
    name?: string;
    description?: string;
  };
}

export interface InitUploadSkillAssetsData {
  body: {
    resourceId: string;
    draftVersion: number;
    assets: Array<{
      name: string;
      path: string;
      assetResourceType: AssetResourceTypeEnum;
      md5?: string;
      expectedSize?: number;
    }>;
  };
}

export interface DeleteSkillAssetsData {
  body: {
    resourceId: string;
    draftVersion: number;
    assetIds: string[];
  };
}

export interface PublishSkillVersionData {
  body: {
    resourceId: string;
  };
}

export interface RString {
  data?: string;
}

export interface RVoid {
  data?: Record<string, unknown>;
}

export interface RassetUploadInitResponse {
  data?: {
    resourceId?: string;
    version?: number;
    assetUploadTickets?: Array<{
      assetId?: string;
      path?: string;
      name?: string;
      objectKey?: string;
      putUrl?: string;
      callbackHeader?: string;
      flashUploaded?: boolean;
    }>;
  };
}

export interface RSkillResourceInfoResponse {
  data?: SkillInfoApiResponse;
}

export interface RSkillVersionBundleInfoResponse {
  data?: SkillVersionBundleApiResponse;
}

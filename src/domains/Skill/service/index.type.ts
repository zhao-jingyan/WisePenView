import type { SkillDetail, SkillSummary } from '../entity/skill';

export interface UploadSkillAssetRequest {
  clientId?: string;
  name: string;
  path: string;
  content?: string | Blob;
  size?: number;
  md5?: string;
}

export interface UploadSkillAssetProgress {
  clientId: string;
  progress: number;
}

export interface UploadSkillAssetResult {
  clientId: string;
  name: string;
  path: string;
  assetId?: string;
  error?: unknown;
}

export interface UploadSkillAssetsOptions {
  concurrency?: number;
  onProgress?: (progress: UploadSkillAssetProgress) => void;
}

export interface ISkillService {
  getSkillSummaries(groupId?: string): Promise<SkillSummary[]>;
  createSkill(title: string, name?: string, description?: string): Promise<string>;
  getSkillDetail(resourceId: string): Promise<SkillDetail>;
  getSkillVersionFiles(resourceId: string, version: number): Promise<SkillDetail>;
  updateSkillInfo(resourceId: string, name?: string, description?: string): Promise<void>;
  publishVersion(resourceId: string): Promise<void>;
  loadAssetContent(resourceId: string, objectKey: string, targetVersion?: number): Promise<string>;
  deleteAssets(resourceId: string, draftVersion: number, assetIds: string[]): Promise<void>;
  uploadAsset(
    resourceId: string,
    draftVersion: number,
    params: UploadSkillAssetRequest
  ): Promise<string | undefined>;
  uploadAssets(
    resourceId: string,
    draftVersion: number,
    assets: UploadSkillAssetRequest[],
    options?: UploadSkillAssetsOptions
  ): Promise<UploadSkillAssetResult[]>;
  saveAsset(
    resourceId: string,
    draftVersion: number,
    params: { name: string; path: string; content: string }
  ): Promise<string | undefined>;
}

import type { SkillDetail, SkillSummary } from '../entity/skill';

export interface UploadSkillAssetRequest {
  name: string;
  path: string;
  content?: string | Blob;
  size?: number;
  md5?: string;
}

export interface ISkillService {
  getSkillSummaries(groupId?: string): Promise<SkillSummary[]>;
  createSkill(title: string, name?: string, description?: string): Promise<string>;
  getSkillDetail(resourceId: string): Promise<SkillDetail>;
  getSkillVersionFiles(resourceId: string, version: number): Promise<SkillDetail>;
  updateSkillInfo(resourceId: string, name?: string, description?: string): Promise<void>;
  publishVersion(resourceId: string): Promise<void>;
  deleteAssets(resourceId: string, draftVersion: number, assetIds: string[]): Promise<void>;
  uploadAsset(
    resourceId: string,
    draftVersion: number,
    params: UploadSkillAssetRequest
  ): Promise<void>;
  saveAsset(
    resourceId: string,
    draftVersion: number,
    params: { name: string; path: string; content: string }
  ): Promise<void>;
}

import { apiGet, apiPost } from '@/apis/request';
import type {
  CreateSkillData,
  DeleteSkillAssetsData,
  GetSkillAssetStsTokenData,
  GetSkillInfoData,
  GetSkillVersionBundleInfoData,
  InitUploadSkillAssetsData,
  PublishSkillVersionData,
  RassetUploadInitResponse,
  RSkillAssetStsTokenResponse,
  RSkillResourceInfoResponse,
  RSkillVersionBundleInfoResponse,
  RString,
  RVoid,
  UpdateSkillInfoData,
} from './SkillApi.type';

function createSkill(body: CreateSkillData['body']): Promise<RString['data']> {
  return apiPost('/skill/createSkill', body);
}

function getSkillInfo(
  query: GetSkillInfoData['query']
): Promise<RSkillResourceInfoResponse['data']> {
  return apiPost('/skill/getSkillInfo', null, { params: query });
}

function getSkillVersionBundleInfo(
  query: GetSkillVersionBundleInfoData['query']
): Promise<RSkillVersionBundleInfoResponse['data']> {
  return apiPost('/skill/getSkillVersionBundleInfo', null, { params: query });
}

function getSkillAssetStsToken(
  query: GetSkillAssetStsTokenData['query']
): Promise<RSkillAssetStsTokenResponse['data']> {
  return apiGet('/skill/getSkillAssetStsToken', { params: query });
}

function changeSkillInfo(body: UpdateSkillInfoData['body']): Promise<RVoid['data']> {
  return apiPost('/skill/changeSkillInfo', body);
}

function initUploadSkillAssets(
  body: InitUploadSkillAssetsData['body']
): Promise<RassetUploadInitResponse['data']> {
  return apiPost('/skill/initUploadSkillAssets', body);
}

function deleteSkillAssets(body: DeleteSkillAssetsData['body']): Promise<RVoid['data']> {
  return apiPost('/skill/deleteSkillAssets', body);
}

function publishSkillVersion(body: PublishSkillVersionData['body']): Promise<RVoid['data']> {
  return apiPost('/skill/publishSkillVersion', body);
}

export const SkillApi = {
  createSkill,
  getSkillInfo,
  getSkillVersionBundleInfo,
  getSkillAssetStsToken,
  changeSkillInfo,
  initUploadSkillAssets,
  deleteSkillAssets,
  publishSkillVersion,
};

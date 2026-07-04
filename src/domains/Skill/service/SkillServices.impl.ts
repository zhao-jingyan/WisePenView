import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { IUserService } from '@/domains/User';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { SkillApi } from '../apis/SkillApi';
import { SkillServicesMap } from '../mapper/SkillServices.map';
import type { ISkillService, UploadSkillAssetRequest } from './index.type';

export interface SkillServicesDeps {
  resourceService: IResourceService;
  userService: IUserService;
}

function buildUploadBody(params: UploadSkillAssetRequest): Blob {
  if (params.content instanceof Blob) return params.content;
  return new Blob([params.content ?? ''], { type: 'text/plain;charset=utf-8' });
}

export const createSkillServices = (deps: SkillServicesDeps): ISkillService => {
  const { resourceService, userService } = deps;

  const getSkillSummaries = async (groupId?: string) => {
    const base = {
      page: 1,
      size: 100,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      resourceType: 'SKILL',
    };
    const page = groupId
      ? await resourceService.getGroupResources({ ...base, groupId })
      : await resourceService.getUserResources(base);
    return page.list.map(SkillServicesMap.mapSkillSummary).filter((item) => item.resourceId);
  };

  const createSkill = async (title: string, name?: string, description?: string) => {
    const resourceId = await SkillApi.createSkill({ title, name, description });
    return resourceId ?? '';
  };

  const getSkillDetail = async (resourceId: string) => {
    const [currentUser, info] = await Promise.all([
      userService.getUserInfo(),
      SkillApi.getSkillInfo({ resourceId }),
    ]);
    const isOwner = info?.resourceInfo?.ownerId === currentUser.id;
    if (!isOwner) {
      return SkillServicesMap.mapSkillDetail({
        resourceId,
        info,
        currentUserId: currentUser.id,
      });
    }

    const draftVersion = (info?.skillInfo?.version ?? 0) + 1;
    const bundle = await SkillApi.getSkillVersionBundleInfo({
      resourceId,
      version: draftVersion,
    });

    return SkillServicesMap.mapSkillDetail({
      resourceId,
      info,
      bundle,
      currentUserId: currentUser.id,
    });
  };

  const getSkillVersionFiles = async (resourceId: string, version: number) => {
    const [currentUser, info, bundle] = await Promise.all([
      userService.getUserInfo(),
      SkillApi.getSkillInfo({ resourceId }),
      SkillApi.getSkillVersionBundleInfo({ resourceId, version }),
    ]);

    return SkillServicesMap.mapSkillDetail({
      resourceId,
      info,
      bundle,
      currentUserId: currentUser.id,
    });
  };

  const updateSkillInfo = async (resourceId: string, name?: string, description?: string) => {
    await SkillApi.changeSkillInfo({ resourceId, name, description });
  };

  const publishVersion = async (resourceId: string) => {
    await SkillApi.publishSkillVersion({ resourceId });
  };

  const deleteAssets = async (resourceId: string, draftVersion: number, assetIds: string[]) => {
    await SkillApi.deleteSkillAssets({ resourceId, draftVersion, assetIds });
  };

  const uploadAsset = async (
    resourceId: string,
    draftVersion: number,
    params: UploadSkillAssetRequest
  ) => {
    const body = buildUploadBody(params);
    const res = await SkillApi.initUploadSkillAssets({
      resourceId,
      draftVersion,
      assets: [
        {
          name: params.name,
          path: params.path,
          assetResourceType: SkillServicesMap.resolveAssetResourceType(params.name),
          md5: params.md5,
          expectedSize: params.size ?? body.size,
        },
      ],
    });
    const ticket = res?.assetUploadTickets?.[0];
    if (!ticket?.putUrl || !ticket.callbackHeader) return;
    await putOssPresignedUrl({
      putUrl: ticket.putUrl,
      callbackHeader: ticket.callbackHeader,
      body,
    });
  };

  const saveAsset = async (
    resourceId: string,
    draftVersion: number,
    params: { name: string; path: string; content: string }
  ) => {
    await uploadAsset(resourceId, draftVersion, params);
  };

  return {
    getSkillSummaries,
    createSkill,
    getSkillDetail,
    getSkillVersionFiles,
    updateSkillInfo,
    publishVersion,
    deleteAssets,
    uploadAsset,
    saveAsset,
  };
};

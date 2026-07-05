import type { IResourceService, ResourceItem, ResourceListPage } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { IUserService } from '@/domains/User';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { SkillApi } from '../apis/SkillApi';
import { SkillServicesMap } from '../mapper/SkillServices.map';
import type { ISkillService, UploadSkillAssetRequest } from './index.type';

const SKILL_SUMMARY_PAGE_SIZE = 100;

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

  const fetchSkillSummaryPages = async (
    requestPage: (page: number) => Promise<ResourceListPage>
  ): Promise<ResourceItem[]> => {
    const items: ResourceItem[] = [];
    let page = 1;

    while (true) {
      const result = await requestPage(page);
      items.push(...result.list);

      const pageSize = result.size > 0 ? result.size : SKILL_SUMMARY_PAGE_SIZE;
      const reachedKnownTotal = result.total > 0 && items.length >= result.total;
      const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
      const reachedShortPage = result.list.length < pageSize;
      if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) break;
      page += 1;
    }

    return items;
  };

  const getSkillSummaries = async (groupId?: string) => {
    const base = {
      size: SKILL_SUMMARY_PAGE_SIZE,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      resourceType: 'SKILL',
    };
    const items = await fetchSkillSummaryPages((page) =>
      groupId
        ? resourceService.getGroupResources({ ...base, page, groupId })
        : resourceService.getUserResources({ ...base, page })
    );
    return items.map(SkillServicesMap.mapSkillSummary).filter((item) => item.resourceId);
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

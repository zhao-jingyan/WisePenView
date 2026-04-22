import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  RenameResourceRequest,
  ResourceListPage,
} from '../../services/Resource';
import type { ResourceItem } from '../../types/resource';
import { useRecentFilesStore } from '../../store';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const toResourceItem = (
  item: Omit<ResourceItem, 'ownerInfo'> & { ownerInfo?: ResourceItem['ownerInfo'] }
): ResourceItem => ({
  ...item,
  ownerInfo: item.ownerInfo ?? {},
});

/** 额外生成的「文档」条数，用于压力测试侧边栏 / 列表；按需改大改小 */
const MOCK_STRESS_FILE_COUNT = 120;

const buildStressMockItems = (count: number): ResourceItem[] =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      resourceId: `mock-stress-${String(n).padStart(4, '0')}`,
      resourceName: `压力测试文档 ${n}.pdf`,
      ownerInfo: {},
      resourceType: 'file',
      ownerId: '1',
      size: 2048 + n * 100,
      path: '/',
      currentTags: {},
    };
  });

const fullMockResourceList: ResourceItem[] = [
  ...(mockdata.resourceListPage as unknown as ResourceListPage).list.map(toResourceItem),
  ...buildStressMockItems(MOCK_STRESS_FILE_COUNT),
];

const paginateMockResources = (params: GetUserResourcesRequest): ResourceListPage => {
  const { page, size } = params;
  let rows = fullMockResourceList;
  if (params.resourceType != null && params.resourceType !== '') {
    rows = rows.filter((r) => r.resourceType === params.resourceType);
  }
  const total = rows.length;
  const totalPage = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const list = rows.slice(start, start + size);
  return {
    list,
    total,
    page,
    size,
    totalPage,
  };
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  await delay(200);
  return paginateMockResources(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  await delay(200);
  return paginateMockResources(params);
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  await delay(150);
  useRecentFilesStore.getState().updateFileName(params.resourceId, params.newName);
};

const updateResourcePath = async (): Promise<void> => {
  await delay(150);
};

const updateResourceTags = async (): Promise<void> => {
  await delay(150);
};

export const ResourceServicesMock: IResourceService = {
  getUserResources,
  getGroupResources,
  renameResource,
  updateResourcePath,
  updateResourceTags,
};

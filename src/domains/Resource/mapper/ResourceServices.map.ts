import type { ResourceItem } from '@/domains/Resource';

const mapResourceItemFromApi = (item: ResourceItem): ResourceItem => {
  const tagIds = Object.keys(item.currentTags ?? {});
  const mainTagId = tagIds[0];
  const linkTagIds = tagIds.slice(1);
  return {
    ...item,
    mainTagId,
    linkTagIds,
  };
};

export const ResourceServicesMap = {
  mapResourceItemFromApi,
};

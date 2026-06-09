export type { ResourceItem } from './entity/resource';
export type { SkillScopeType, SkillSummary } from './entity/skill';
export {
  NOTE_CONFIGURABLE_RESOURCE_ACTION_OPTIONS,
  RESOURCE_ACTION,
  RESOURCE_SORT_BY,
  RESOURCE_SORT_DIR,
  RESOURCE_TYPE,
  SEARCH_RESOURCE_TYPE,
  SEARCH_SCOPE,
  TAG_QUERY_LOGIC_MODE,
  actionsToPermissionCode,
  coerceResourceActions,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  isNoteConfigurableResourceAction,
  maskNoteConfigurableResourceActions,
  normalizeResourceActions,
  normalizeSearchResourceType,
  permissionCodeToActions,
  resourceActionsInclude,
  resourceActionsToApiKeys,
} from './enum';
export type {
  ResourceAction,
  ResourceActionKey,
  ResourceSortBy,
  ResourceSortDir,
  SearchResourceType,
  SearchScope,
  TagQueryLogicMode,
} from './enum';
export { groupSearchHits } from './service/groupSearchHits';
export type { SearchHitGroup } from './service/groupSearchHits';
export type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  InteractRateRequest,
  InteractToggleLikeRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceListPage,
  SearchHitItem,
  SearchQueryRequest,
  SearchResultPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourceTagsRequest,
} from './service/index.type';

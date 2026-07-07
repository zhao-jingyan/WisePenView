import type { ResourceActionKey, ResourceItem } from '@/domains/Resource';
import type { AccessControlScope, TagResourceActionKey } from '@/domains/Tag';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export type ResourceActionApiValue = ResourceActionKey | number | `${number}`;
export type ResourceActionApiList = ResourceActionApiValue[];

export interface ResourceInteractionInfoApiResponse {
  readCount?: number;
  likeCount?: number;
  scoreCount?: number;
  scoreTotal?: number;
  favoriteCount?: number;
  commentCount?: number;
}

export interface ResourceTagInfoApiResponse {
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
}

export interface ResourceTagBindApiResponse {
  groupId?: string;
  primaryTagId?: string;
  tags?: Record<string, ResourceTagInfoApiResponse | null | undefined>;
}

export type ResourceGroupTypeApiValue = 1 | 2 | 3 | '1' | '2' | '3';

export interface ResourceGroupDisplayBaseApiResponse {
  groupName?: string | null;
  groupDesc?: string | null;
  groupCoverUrl?: string | null;
  groupType?: ResourceGroupTypeApiValue | null;
}

export interface ResourceGroupGrantedActionsApiResponse {
  groupId: string;
  groupInfo?: ResourceGroupDisplayBaseApiResponse | null;
  grantedActions?: ResourceActionApiList | null;
}

export interface ResourceSpecifiedUserGrantedActionsApiResponse {
  userId: string;
  userInfo?: UserDisplayBaseApiResponse | null;
  grantedActions?: ResourceActionApiList | null;
}

export interface ResourceItemApiResponse extends Omit<
  ResourceItem,
  | 'size'
  | 'ownerInfo'
  | 'readCount'
  | 'likeCount'
  | 'scoreAvg'
  | 'currentTags'
  | 'tagBinds'
  | 'resourceIconType'
  | 'mainTagId'
  | 'linkTagIds'
  | 'currentActions'
  | 'overrideGrantedActions'
  | 'specifiedUsersGrantedActions'
> {
  size?: number;
  ownerInfo: UserDisplayBaseApiResponse;
  resourceInteractionInfo?: ResourceInteractionInfoApiResponse;
  tagBinds?: ResourceTagBindApiResponse[];
  currentActions?: ResourceActionApiList | null;
  overrideGrantedActions?: ResourceGroupGrantedActionsApiResponse[] | null;
  specifiedUsersGrantedActions?: ResourceSpecifiedUserGrantedActionsApiResponse[] | null;
}

export interface ResourceListPageApiResponse {
  list: ResourceItemApiResponse[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface ListResourceItemsApiRequest {
  page: number;
  size: number;
  sortBy: string;
  sortDir: string;
  resourceType?: string;
  tagIds?: string[];
  tagQueryLogicMode?: string;
  groupId?: string;
}

export interface RenameResourceApiRequest {
  resourceId: string;
  newName: string;
}

export interface ChangeResourceTagsApiRequest {
  resourceId: string;
  tagIds: string[];
  groupId?: string;
  primaryTagId?: string;
}

export interface ChangeResourceActionPermissionApiRequest {
  resourceId: string;
  overrideGrantedActions?: Record<string, ResourceActionKey[] | null> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceActionKey[]> | null;
}

export interface RemoveResourcesApiRequest {
  resourceIds: string[];
}

export interface GlobalSearchApiRequest {
  keyword: string;
  scope: string;
  page: number;
  size: number;
}

export interface GlobalSearchApiResponse {
  list: Array<{
    resourceId: string;
    resourceType: string;
    resourceName: string;
    highlightContent: string | null;
    updateTime: string;
  }>;
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface AddTagApiRequest {
  groupId?: string;
  parentId?: string;
  tagName: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceActionKey[];
}

export interface ChangeTagApiRequest {
  groupId?: string;
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceActionKey[];
  targetTagId: string;
}

export interface RemoveTagApiRequest {
  groupId?: string;
  targetTagId: string;
}

export interface MoveTagApiRequest {
  groupId?: string;
  targetTagId: string;
  newParentId?: string;
}

export interface GetTagTreeApiRequest {
  groupId?: string;
}

export interface TagTreeResponse {
  tagId: string;
  tagName: string;
  groupId?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
  visibilityMode?: string;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  taggedResourceGrantedActionsMask?: number;
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: ResourceActionApiList;
  parentId?: string;
  children?: TagTreeResponse[];
}

export type GetTagTreeApiResponse = TagTreeResponse[];

import type { PageR } from '@/apis/api.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export type ResourceActionApiKey =
  | 'DISCOVER'
  | 'VIEW'
  | 'LOAD'
  | 'EDIT'
  | 'INLINE_COMMENT'
  | 'DOWNLOAD_WATERMARK'
  | 'DOWNLOAD_ORIGINAL'
  | 'FORK'
  | 'COMMENT';
type ResourceActionApiValue = ResourceActionApiKey | number | `${number}`;
export type ResourceActionApiList = ResourceActionApiValue[];
type ResourceSizeApiValue = number | `${number}`;

export interface ResourceInteractionInfoApiResponse {
  readCount?: number;
  likeCount?: number;
  scoreCount?: number;
  scoreTotal?: number;
  favoriteCount?: number;
  commentCount?: number;
}

interface ResourceTagInfoApiResponse {
  tagName?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagCreator?: string;
  isPath?: boolean;
}

interface ResourceTagBindApiResponse {
  groupId?: string;
  primaryTagId?: string;
  tags?: Record<string, ResourceTagInfoApiResponse | null | undefined>;
}

type ResourceGroupTypeApiValue = 1 | 2 | 3 | '1' | '2' | '3';

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

export interface ResourceItemApiResponse {
  resourceId: string;
  resourceName: string;
  ownerId?: string;
  size?: ResourceSizeApiValue | null;
  ownerInfo: UserDisplayBaseApiResponse;
  resourceType?: string;
  preview?: string;
  path?: string;
  resourceInteractionInfo?: ResourceInteractionInfoApiResponse;
  tagBinds?: ResourceTagBindApiResponse[];
  currentActions?: ResourceActionApiList | null;
  resourceAccessRole?: 'OWNER' | 'OWNER_SPECIFIED' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'NONE';
  overrideGrantedActions?: ResourceGroupGrantedActionsApiResponse[] | null;
  specifiedUsersGrantedActions?: ResourceSpecifiedUserGrantedActionsApiResponse[] | null;
}

export type ResourceListPageApiResponse = PageR<ResourceItemApiResponse>;

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
  overrideGrantedActions?: Record<string, ResourceActionApiKey[] | null> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceActionApiKey[]> | null;
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

export interface GlobalSearchItemApiResponse {
  resourceId: string;
  resourceType: string;
  resourceName: string;
  highlightContent: string | null;
  updateTime: string;
}

export type GlobalSearchApiResponse = PageR<GlobalSearchItemApiResponse>;

export interface ResourceInlineCommentAnchorRefApiResponse {
  externalAnchorId?: string | null;
  quoteText?: string | null;
  anchorPayload?: Record<string, unknown> | null;
}

export interface ResourceInlineCommentItemReactionApiResponse {
  emojiId?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
}

export interface ResourceInlineCommentItemReactionGroupApiResponse {
  emojiId?: string | null;
  count?: number | null;
  reactedByCurrentUser?: boolean | null;
  users?: Array<{
    id?: string | number | null;
    name?: string | null;
    nickname?: string | null;
    realName?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
  } | null> | null;
}

export interface ResourceInlineCommentItemApiResponse {
  itemId?: string | null;
  authorId?: string | null;
  authorInfo?: {
    id?: string | number | null;
    name?: string | null;
    nickname?: string | null;
    realName?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
  } | null;
  content?: string | null;
  imageUrls?: string[] | null;
  mentionUserIds?: string[] | null;
  reactions?: Record<
    string,
    ResourceInlineCommentItemReactionApiResponse | null | undefined
  > | null;
  reactionGroups?: ResourceInlineCommentItemReactionGroupApiResponse[] | null;
  createTime?: string | null;
  updateTime?: string | null;
}

export interface ResourceInlineCommentApiResponse {
  inlineCommentId?: string | null;
  resourceId?: string | null;
  creatorId?: string | null;
  creatorInfo?: {
    id?: string | number | null;
    name?: string | null;
    nickname?: string | null;
    realName?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
  } | null;
  anchorRef?: ResourceInlineCommentAnchorRefApiResponse | null;
  resolved?: boolean | null;
  resolvedBy?: string | null;
  resolvedByInfo?: {
    id?: string | number | null;
    name?: string | null;
    nickname?: string | null;
    realName?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
  } | null;
  resolvedAt?: string | null;
  applicableFromVersion?: number | null;
  applicableToVersion?: number | null;
  createTime?: string | null;
  updateTime?: string | null;
  items?: ResourceInlineCommentItemApiResponse[] | null;
}

export interface ListInlineCommentsApiRequest {
  resourceId: string;
  contentVersion?: number;
  resolved?: boolean;
}

export type ListInlineCommentsApiResponse = ResourceInlineCommentApiResponse[];

export interface CreateInlineCommentApiRequest {
  resourceId: string;
  externalAnchorId: string;
  quoteText?: string;
  anchorPayload?: Record<string, unknown>;
  contentVersion?: number;
  applicableFromVersion?: number;
  applicableToVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface AddInlineCommentItemApiRequest {
  resourceId: string;
  inlineCommentId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface UpdateInlineCommentItemApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  content: string;
  imageUrls?: string[];
  mentionUserIds?: string[];
}

export interface DeleteInlineCommentItemApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
}

export interface ChangeInlineCommentResolveStatusApiRequest {
  resourceId: string;
  inlineCommentId: string;
  resolved: boolean;
  contentVersion?: number;
}

export interface SetInlineCommentItemReactionApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
  emojiId: string;
}

export interface DeleteInlineCommentItemReactionApiRequest {
  resourceId: string;
  inlineCommentId: string;
  itemId: string;
  contentVersion?: number;
}

import type { NoteInfoResponse } from '@/domains/Note';
import {
  coerceResourceActions,
  maskNoteConfigurableResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
} from '@/domains/Resource';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeResourceItem } from '@/utils/normalize/normalizeResourceItem';
import type {
  CreateNoteResponse,
  NoteInfoDisplayData,
  NotePermissionConfig,
  SyncTitleRequest,
} from '../service/index.type';

const mapSyncTitleRequest = (
  params: SyncTitleRequest
): { resourceId: string; newName: string } => ({
  resourceId: params.resourceId,
  newName: params.newName,
});

const mapCreateNoteFromApi = (resourceId: string): CreateNoteResponse => ({
  // fallback：旧接口可能返回空字符串
  resourceId: resourceId || undefined,
});

const mapNoteInfoDisplayFromApi = (data: NoteInfoResponse): NoteInfoDisplayData => {
  // readCount/likeCount 后端以字符串返回（Java Long），归一化为 number
  const resourceInfo = normalizeResourceItem(data.resourceInfo);
  const ownerId = normalizeId(resourceInfo.ownerId) || undefined;
  // fallback：缺失 authors 时按无作者处理
  const authorIds = data.noteInfo.authors ?? [];

  return {
    noteTitle: resourceInfo.resourceName,
    ownerId,
    authors: authorIds.map((authorId) => {
      const author = data.authorsDisplay?.[authorId];
      return {
        // fallback：作者展示名缺失时显示未知用户
        name: author?.nickname || author?.realName || '未知用户',
        avatar: author?.avatar,
      };
    }),
    // fallback：缺失更新时间时显示暂无
    lastEditedAtText: formatTimestampToDateTime(data.noteInfo.lastUpdatedAt) || '暂无',
    // fallback：缺失阅读量时按暂无数据展示
    readCount: resourceInfo.readCount ?? null,
    // fallback：缺失点赞数时按暂无数据展示
    likeCount: resourceInfo.likeCount ?? null,
    // fallback：缺失评分均值时按暂无评分展示
    scoreAvg: resourceInfo.scoreAvg ?? null,
    // fallback：缺失 liked 时按未点赞展示
    liked: resourceInfo.liked ?? false,
    // fallback：缺失 userScore 时按未评分展示
    userScore: resourceInfo.userScore ?? null,
    canCollaborativeEdit: resourceActionsInclude(resourceInfo.currentActions, RESOURCE_ACTION.EDIT),
  };
};

const mapSpecifiedUsersGrantedActionsFromApi = (
  raw: Record<string, unknown[]> | null | undefined
): NotePermissionConfig['specifiedUsersGrantedActions'] => {
  if (!raw) {
    return null;
  }
  const mapped = Object.fromEntries(
    Object.entries(raw).map(([userId, actions]) => [
      userId,
      maskNoteConfigurableResourceActions(coerceResourceActions(actions)),
    ])
  );
  return Object.keys(mapped).length > 0 ? mapped : null;
};

const mapNotePermissionConfigFromApi = (
  data: NoteInfoResponse,
  fallbackResourceId: string
): NotePermissionConfig => {
  const { resourceInfo } = data;
  const overrideGrantedActions = maskNoteConfigurableResourceActions(
    coerceResourceActions(resourceInfo.overrideGrantedActions as unknown[] | undefined)
  );

  return {
    // fallback：缺失 resourceId 时使用请求参数
    resourceId: resourceInfo.resourceId || fallbackResourceId,
    // fallback：无 override 权限时返回 null
    overrideGrantedActions: overrideGrantedActions.length > 0 ? overrideGrantedActions : null,
    specifiedUsersGrantedActions: mapSpecifiedUsersGrantedActionsFromApi(
      resourceInfo.specifiedUsersGrantedActions as Record<string, unknown[]> | undefined
    ),
  };
};

export const NoteServicesMap = {
  mapSyncTitleRequest,
  mapCreateNoteFromApi,
  mapNoteInfoDisplayFromApi,
  mapNotePermissionConfigFromApi,
};

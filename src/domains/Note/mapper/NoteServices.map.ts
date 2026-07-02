import type { NoteInfoResponse } from '@/domains/Note';
import type { SaveDrawIoSnapshotApiRequest } from '@/domains/Note/apis/NoteApi.type';
import {
  coerceResourceActions,
  maskNoteConfigurableResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
} from '@/domains/Resource';
import { normalizeResourceItem } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  CreateNoteResponse,
  DrawIoLatestSnapshotData,
  ForkNoteResponse,
  NoteInfoDisplayAuthor,
  NoteInfoDisplayData,
  NotePermissionConfig,
  NoteVersionListPage,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '../service/index.type';

const mapSyncTitleRequest = (
  params: SyncTitleRequest
): { resourceId: string; newName: string } => ({
  resourceId: params.resourceId,
  newName: params.newName,
});

const mapCreateNoteFromApi = (resourceId: string): CreateNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapForkNoteFromApi = (resourceId: string): ForkNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapAuthorDisplay = (author?: {
  nickname?: string;
  realName?: string;
  avatar?: string;
}): NoteInfoDisplayAuthor => ({
  // fallback：作者展示名缺失时显示未知用户
  name: author?.nickname || author?.realName || '未知用户',
  avatar: author?.avatar,
});

const mapNoteInfoDisplayFromApi = (data: NoteInfoResponse): NoteInfoDisplayData => {
  // 将后端 ResourceItem 中的 Long 字段归一化为 number
  const resourceInfo = normalizeResourceItem(data.resourceInfo);
  const ownerId = normalizeId(resourceInfo.ownerId) || undefined;
  const authorsDisplay = data.authorsDisplay ?? {};
  const authors = Object.values(authorsDisplay).map(mapAuthorDisplay);

  return {
    noteTitle: resourceInfo.resourceName,
    ownerId,
    authors,
    // 新版接口未返回上次编辑时间，暂使用占位文案。
    lastEditedAtText: '暂无',
    // 资源实体（已归一化），供展示阅读量/点赞/评分等统计字段
    resourceInfo,
    version: data.version,
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

const encodeBase64Utf8 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const mapDrawIoLatestSnapshotFromApi = (
  raw: Partial<DrawIoLatestSnapshotData> | null | undefined,
  fallbackResourceId: string
): DrawIoLatestSnapshotData => ({
  resourceId: raw?.resourceId || fallbackResourceId,
  version: raw?.version ?? 0,
  fullSnapshot: raw?.fullSnapshot ?? null,
  deltas: raw?.deltas ?? null,
});

const mapSaveDrawIoSnapshotRequest = (
  params: SaveDrawIoSnapshotRequest
): SaveDrawIoSnapshotApiRequest => ({
  resourceId: params.resourceId,
  version: params.version,
  data: encodeBase64Utf8(params.xml),
  plainText: params.plainText,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

const mapNoteVersionListPageFromApi = (raw: unknown): NoteVersionListPage => {
  const page = isRecord(raw) ? raw : {};
  const list = Array.isArray(page.list) ? page.list : [];

  return {
    list: list.filter(isRecord).map((item) => ({
      version: typeof item.version === 'number' ? item.version : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      createdBy: Array.isArray(item.createdBy)
        ? item.createdBy.filter((value): value is number => typeof value === 'number')
        : undefined,
    })),
    total: readNumber(page.total),
    page: readNumber(page.page, 1),
    size: readNumber(page.size, 20),
    totalPage: readNumber(page.totalPage),
  };
};

export const NoteServicesMap = {
  mapSyncTitleRequest,
  mapCreateNoteFromApi,
  mapForkNoteFromApi,
  mapNoteInfoDisplayFromApi,
  mapNotePermissionConfigFromApi,
  mapDrawIoLatestSnapshotFromApi,
  mapSaveDrawIoSnapshotRequest,
  mapNoteVersionListPageFromApi,
};

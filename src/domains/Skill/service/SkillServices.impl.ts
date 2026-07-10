import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { IUserService } from '@/domains/User';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import OSS from 'ali-oss';
import { SkillApi } from '../apis/SkillApi';
import type { RSkillAssetStsTokenResponse } from '../apis/SkillApi.type';
import { SkillServicesMap } from '../mapper/SkillServices.map';
import type {
  ISkillService,
  UploadSkillAssetRequest,
  UploadSkillAssetResult,
  UploadSkillAssetsOptions,
} from './index.type';

interface SkillServicesDeps {
  resourceService: IResourceService;
  userService: IUserService;
}

type SkillAssetStsToken = NonNullable<RSkillAssetStsTokenResponse['data']>;

interface SkillAssetClientCache {
  client: OSS;
  expiresAt: number;
}

const STS_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_STS_EXPIRES_IN_MS = 55 * 60_000;
const DEFAULT_UPLOAD_CONCURRENCY = 4;
const DEFAULT_UPLOAD_INIT_BATCH_SIZE = 12;

function buildUploadBody(params: UploadSkillAssetRequest): Blob {
  if (params.content instanceof Blob) return params.content;
  return new Blob([params.content ?? ''], { type: 'text/plain;charset=utf-8' });
}

function resolveUploadClientId(params: UploadSkillAssetRequest, index: number): string {
  return params.clientId ?? `${params.path}:${params.name}:${String(index)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveStsExpiresAt(expiration?: string): number {
  if (!expiration) return Date.now() + DEFAULT_STS_EXPIRES_IN_MS;
  const expiresAt = Date.parse(expiration);
  return Number.isFinite(expiresAt) ? expiresAt : Date.now() + DEFAULT_STS_EXPIRES_IN_MS;
}

function buildOssClient(token: SkillAssetStsToken): OSS {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    (!token.region && !token.endpoint)
  ) {
    throw new Error('技能文件访问凭证不完整');
  }

  return new OSS({
    region: token.region,
    endpoint: token.endpoint,
    bucket: token.bucket,
    accessKeyId: token.accessKeyId,
    accessKeySecret: token.accessKeySecret,
    stsToken: token.securityToken,
    secure: true,
  });
}

function isTextReadable(value: unknown): value is { text: () => Promise<string> } {
  return isRecord(value) && typeof value.text === 'function';
}

async function stringifyOssContent(content: unknown): Promise<string> {
  if (typeof content === 'string') return content;
  if (content instanceof ArrayBuffer) return new TextDecoder().decode(content);
  if (ArrayBuffer.isView(content)) return new TextDecoder().decode(content);
  if (content instanceof Blob) return content.text();
  if (isTextReadable(content)) return content.text();
  return content == null ? '' : String(content);
}

function isOssAuthExpiredError(err: unknown): boolean {
  if (!isRecord(err)) return false;
  const status = err.status ?? err.statusCode;
  const code = typeof err.code === 'string' ? err.code : '';
  return (
    status === 403 ||
    status === '403' ||
    code === 'SecurityTokenExpired' ||
    code === 'InvalidAccessKeyId'
  );
}

function buildAssetClientCacheKey(resourceId: string, targetVersion?: number): string {
  return `${resourceId}:${targetVersion ?? 'published'}`;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  return results;
}

export const createSkillServices = (deps: SkillServicesDeps): ISkillService => {
  const { resourceService, userService } = deps;
  const assetClientCache = new Map<string, SkillAssetClientCache>();

  const getAssetClient = async (
    resourceId: string,
    targetVersion?: number,
    forceRefresh = false
  ) => {
    const cacheKey = buildAssetClientCacheKey(resourceId, targetVersion);
    const cached = assetClientCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt - STS_REFRESH_BUFFER_MS > Date.now()) {
      return cached.client;
    }

    const token = await SkillApi.getSkillAssetStsToken({ resourceId, targetVersion });
    if (!token) {
      throw new Error('获取技能文件访问凭证失败');
    }

    const client = buildOssClient(token);
    assetClientCache.set(cacheKey, {
      client,
      expiresAt: resolveStsExpiresAt(token.expiration),
    });
    return client;
  };

  const readAssetContent = async (
    resourceId: string,
    objectKey: string,
    targetVersion?: number,
    forceRefresh = false
  ) => {
    const client = await getAssetClient(resourceId, targetVersion, forceRefresh);
    const result = await client.get(objectKey);
    return stringifyOssContent(result.content);
  };

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
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CREATE_RESOURCE_ID_MISSING);
    }
    return resourceId;
  };

  const getSkillDetail = async (resourceId: string) => {
    const [currentUser, info] = await Promise.all([
      userService.getUserInfo(),
      SkillApi.getSkillInfo({ resourceId }),
    ]);
    const publishedVersion = info?.skillInfo?.version ?? 0;
    const isOwner = info?.resourceInfo?.ownerId === currentUser.id;
    const targetVersion = isOwner ? publishedVersion + 1 : publishedVersion;
    const bundle =
      targetVersion > 0
        ? await SkillApi.getSkillVersionBundleInfo({
            resourceId,
            version: targetVersion,
          })
        : undefined;

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

  const loadAssetContent = async (
    resourceId: string,
    objectKey: string,
    targetVersion?: number
  ) => {
    if (!objectKey) {
      throw new Error('技能文件缺少 objectKey');
    }
    try {
      return await readAssetContent(resourceId, objectKey, targetVersion);
    } catch (err) {
      if (!isOssAuthExpiredError(err)) throw err;
      return readAssetContent(resourceId, objectKey, targetVersion, true);
    }
  };

  const deleteAssets = async (resourceId: string, draftVersion: number, assetIds: string[]) => {
    if (assetIds.length === 0) return;
    await SkillApi.deleteSkillAssets({ resourceId, draftVersion, assetIds });
  };

  const uploadAssets = async (
    resourceId: string,
    draftVersion: number,
    assets: UploadSkillAssetRequest[],
    options?: UploadSkillAssetsOptions
  ): Promise<UploadSkillAssetResult[]> => {
    if (assets.length === 0) return [];

    const entries = assets.map((asset, index) => ({
      request: asset,
      body: buildUploadBody(asset),
      clientId: resolveUploadClientId(asset, index),
    }));
    const results = new Array<UploadSkillAssetResult>(entries.length);

    for (let start = 0; start < entries.length; start += DEFAULT_UPLOAD_INIT_BATCH_SIZE) {
      const batchEntries = entries.slice(start, start + DEFAULT_UPLOAD_INIT_BATCH_SIZE);
      let tickets: NonNullable<
        NonNullable<
          Awaited<ReturnType<typeof SkillApi.initUploadSkillAssets>>
        >['assetUploadTickets']
      > = [];

      try {
        const res = await SkillApi.initUploadSkillAssets({
          resourceId,
          draftVersion,
          assets: batchEntries.map(({ request, body }) => ({
            name: request.name,
            path: request.path,
            assetResourceType: SkillServicesMap.resolveAssetResourceType(request.name),
            md5: request.md5,
            expectedSize: request.size ?? body.size,
          })),
        });
        tickets = res?.assetUploadTickets ?? [];
      } catch (error) {
        batchEntries.forEach(({ request, clientId }, batchIndex) => {
          results[start + batchIndex] = {
            clientId,
            name: request.name,
            path: request.path,
            error,
          };
        });
        continue;
      }

      const batchResults = await runWithConcurrency(
        batchEntries,
        options?.concurrency ?? DEFAULT_UPLOAD_CONCURRENCY,
        async ({ request, body, clientId }, index) => {
          const ticket = tickets[index];
          try {
            if (!ticket?.assetId) {
              throw new Error(`技能文件上传票据缺少 assetId：${request.name}`);
            }

            options?.onProgress?.({ clientId, progress: 0 });
            if (ticket.putUrl && ticket.callbackHeader) {
              await putOssPresignedUrl({
                putUrl: ticket.putUrl,
                callbackHeader: ticket.callbackHeader,
                body,
                onProgress: (progress) => options?.onProgress?.({ clientId, progress }),
              });
            }
            options?.onProgress?.({ clientId, progress: 100 });

            return {
              clientId,
              name: request.name,
              path: request.path,
              assetId: ticket.assetId,
            };
          } catch (error) {
            if (ticket?.assetId) {
              await SkillApi.deleteSkillAssets({
                resourceId,
                draftVersion,
                assetIds: [ticket.assetId],
              }).catch(() => undefined);
            }
            return {
              clientId,
              name: request.name,
              path: request.path,
              assetId: ticket?.assetId,
              error,
            };
          }
        }
      );

      batchResults.forEach((result, batchIndex) => {
        results[start + batchIndex] = result;
      });
    }

    return results;
  };

  const uploadAsset = async (
    resourceId: string,
    draftVersion: number,
    params: UploadSkillAssetRequest
  ) => {
    const [result] = await uploadAssets(resourceId, draftVersion, [params]);
    if (result?.error) throw result.error;
    return result?.assetId;
  };

  const saveAsset = async (
    resourceId: string,
    draftVersion: number,
    params: { name: string; path: string; content: string }
  ) => {
    return uploadAsset(resourceId, draftVersion, params);
  };

  return {
    getSkillSummaries,
    createSkill,
    getSkillDetail,
    getSkillVersionFiles,
    updateSkillInfo,
    publishVersion,
    loadAssetContent,
    deleteAssets,
    uploadAsset,
    uploadAssets,
    saveAsset,
  };
};

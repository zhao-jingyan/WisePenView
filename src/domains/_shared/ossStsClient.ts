import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import OSS from 'ali-oss';

export interface OssStsToken {
  accessKeyId?: string;
  accessKeySecret?: string;
  securityToken?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  expiration?: string;
}

export interface OssStsClientManagerOptions<Key> {
  loadToken: (key: Key) => Promise<OssStsToken | null | undefined>;
  resolveCacheKey: (key: Key) => string;
  invalidCredentialMessage: string;
  refreshBufferMs?: number;
  defaultExpiresInMs?: number;
}

export interface OssStsClientManager<Key> {
  getClient: (key: Key, options?: { forceRefresh?: boolean }) => Promise<OSS>;
  runWithClient: <Result>(key: Key, operation: (client: OSS) => Promise<Result>) => Promise<Result>;
  clear: () => void;
}

interface CachedOssClient {
  client: OSS;
  expiresAt: number;
}

const DEFAULT_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_EXPIRES_IN_MS = 55 * 60_000;

const resolveExpiresAt = (expiration: string | undefined, defaultExpiresInMs: number): number => {
  if (!expiration) return Date.now() + defaultExpiresInMs;
  const expiresAt = Date.parse(expiration);
  return Number.isFinite(expiresAt) ? expiresAt : Date.now() + defaultExpiresInMs;
};

const createOssClient = (token: OssStsToken, invalidCredentialMessage: string): OSS => {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    (!token.region && !token.endpoint)
  ) {
    throw new Error(invalidCredentialMessage);
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
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isOssAuthExpiredError = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  const status = error.status ?? error.statusCode;
  const code = typeof error.code === 'string' ? error.code : '';
  return (
    status === 403 ||
    status === '403' ||
    code === 'SecurityTokenExpired' ||
    code === 'InvalidAccessKeyId'
  );
};

export const createOssStsClientManager = <Key>(
  options: OssStsClientManagerOptions<Key>
): OssStsClientManager<Key> => {
  const refreshBufferMs = options.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
  const defaultExpiresInMs = options.defaultExpiresInMs ?? DEFAULT_EXPIRES_IN_MS;
  const clientCache = new Map<string, CachedOssClient>();
  const pendingClientCache = new Map<string, Promise<OSS>>();
  let cacheGeneration = 0;

  const clear = (): void => {
    cacheGeneration += 1;
    clientCache.clear();
    pendingClientCache.clear();
  };

  registerServiceCacheCleaner(clear);

  const getClient = async (key: Key, getOptions?: { forceRefresh?: boolean }): Promise<OSS> => {
    const cacheKey = options.resolveCacheKey(key);
    if (getOptions?.forceRefresh) {
      clientCache.delete(cacheKey);
    } else {
      const cached = clientCache.get(cacheKey);
      if (cached && cached.expiresAt - refreshBufferMs > Date.now()) {
        return cached.client;
      }
    }

    const pending = pendingClientCache.get(cacheKey);
    if (pending) return pending;

    const requestGeneration = cacheGeneration;
    const request: Promise<OSS> = options
      .loadToken(key)
      .then((token) => {
        if (!token) {
          throw new Error(options.invalidCredentialMessage);
        }
        if (requestGeneration !== cacheGeneration) {
          throw new Error('登录状态已变更，请重试');
        }

        const client = createOssClient(token, options.invalidCredentialMessage);
        clientCache.set(cacheKey, {
          client,
          expiresAt: resolveExpiresAt(token.expiration, defaultExpiresInMs),
        });
        return client;
      })
      .finally(() => {
        if (pendingClientCache.get(cacheKey) === request) {
          pendingClientCache.delete(cacheKey);
        }
      });
    pendingClientCache.set(cacheKey, request);
    return request;
  };

  const runWithClient = async <Result>(
    key: Key,
    operation: (client: OSS) => Promise<Result>
  ): Promise<Result> => {
    try {
      return await operation(await getClient(key));
    } catch (error) {
      if (!isOssAuthExpiredError(error)) throw error;
      return operation(await getClient(key, { forceRefresh: true }));
    }
  };

  return {
    getClient,
    runWithClient,
    clear,
  };
};

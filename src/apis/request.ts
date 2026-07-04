import Axios from '@/apis/Axios';
import type { ApiResponse } from '@/apis/api.type';
import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { WisePenError } from '@/utils/error';
import type { AxiosRequestConfig } from 'axios';

export type { ApiResponse } from '@/apis/api.type';

const pendingGetRequests = new Map<string, Promise<unknown>>();

registerServiceCacheCleaner(() => {
  pendingGetRequests.clear();
});

function checkResponse(res: ApiResponse<unknown>): void {
  if (res.code !== 200) {
    throw new WisePenError({
      code: res.code,
      source: 'api',
      serverMsg: res.msg,
      message: res.msg,
    });
  }
}

function unwrap<T>(res: ApiResponse<T>): T {
  checkResponse(res);
  return res.data as T;
}

function stableSerialize(value: unknown, seen = new WeakSet<object>()): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return JSON.stringify(value);
  }
  if (valueType === 'bigint') return `bigint:${value.toString()}`;
  if (valueType === 'symbol') return `symbol:${String(value)}`;
  if (valueType === 'function') return `function:${String(value)}`;

  const objectValue = value as object;
  if (seen.has(objectValue)) return '[Circular]';
  seen.add(objectValue);

  try {
    if (value instanceof Date) return `date:${value.toISOString()}`;
    if (value instanceof URLSearchParams) {
      return `URLSearchParams:${stableSerialize(Array.from(value.entries()), seen)}`;
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableSerialize(item, seen)).join(',')}]`;
    }

    const toJSON = (value as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === 'function') {
      return stableSerialize(toJSON.call(value), seen);
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key], seen)}`)
      .join(',')}}`;
  } finally {
    seen.delete(objectValue);
  }
}

function shouldDedupeGetRequest(config?: AxiosRequestConfig): boolean {
  if (!config) return true;
  if (config.signal || config.cancelToken || config.onDownloadProgress) return false;
  return config.responseType === undefined || config.responseType === 'json';
}

function buildGetRequestKey(url: string, config?: AxiosRequestConfig): string {
  return stableSerialize({
    url,
    baseURL: config?.baseURL,
    headers: config?.headers,
    params: config?.params,
    paramsSerializer: config?.paramsSerializer,
    responseType: config?.responseType,
    timeout: config?.timeout,
    withCredentials: config?.withCredentials,
  });
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  if (!shouldDedupeGetRequest(config)) {
    return unwrap((await Axios.get(url, config)) as ApiResponse<T>);
  }

  const requestKey = buildGetRequestKey(url, config);
  const pendingRequest = pendingGetRequests.get(requestKey);
  if (pendingRequest) {
    return pendingRequest as Promise<T>;
  }

  const request = Axios.get(url, config)
    .then((res) => unwrap(res as unknown as ApiResponse<T>))
    .finally(() => {
      pendingGetRequests.delete(requestKey);
    });
  pendingGetRequests.set(requestKey, request);
  return request;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap((await Axios.post(url, data, config)) as ApiResponse<T>);
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap((await Axios.put(url, data, config)) as ApiResponse<T>);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap((await Axios.delete(url, config)) as ApiResponse<T>);
}

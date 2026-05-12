import Axios from '@/apis/Axios';
import type { AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

function checkResponse(res: ApiResponse<unknown>): void {
  if (res.code !== 200) {
    throw new Error(res.msg ?? '请求失败');
  }
}

function unwrap<T>(res: ApiResponse<T>): T {
  checkResponse(res);
  return res.data as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap((await Axios.get(url, config)) as ApiResponse<T>);
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

// axios request 封装
import axios from 'axios';
import { clearAllZustandStores } from '@/store';
import { clearAllServiceCaches } from '@/services/cacheRegistry';
import { emitAuthSyncEvent } from '@/utils/authSync';
import { getApiBaseURL } from '@/utils/apiServerAddr';

const Axios = axios.create({
  timeout: 5000,
  withCredentials: true,
});

// baseURL 由 apiServerAddr 模块自管理（生产模式后台轮询切换内/外网），
// 此处在请求拦截器逐次读取，确保始终命中最新地址。
Axios.interceptors.request.use((config) => {
  config.baseURL = getApiBaseURL();
  return config;
});

Axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) return Promise.reject(error);
    const { status, data } = error.response;
    if (status === 401) {
      clearAllServiceCaches();
      clearAllZustandStores();
      emitAuthSyncEvent('UNAUTHORIZED');
      window.location.href = '/login';
    }
    // 400 视为业务/字段校验错误，500 视为服务端错误，把服务端文案挂到 message 上供上层展示
    if ((status === 400 || status === 500) && data && typeof data === 'object') {
      const msg =
        (data as { msg?: string }).msg ??
        (data as { message?: string }).message ??
        (status === 400 ? '请求参数错误' : '服务器错误');
      error.message = msg;
    }
    return Promise.reject(error);
  }
);

export default Axios;

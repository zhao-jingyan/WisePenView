// axios request 封装
import axios from 'axios';
import { clearAllZustandStores } from '@/store';
import { clearAllServiceCaches } from '@/services/cacheRegistry';
import { emitAuthSyncEvent } from '@/utils/authSync';
import { awaitAddrReady, getApiBaseURL, notifyAddrFailure } from '@/utils/apiServerAddr';

const Axios = axios.create({
  timeout: 5000,
  withCredentials: true,
});

// baseURL 逐次读最新值；addr 可疑不可达时短暂等探测收敛，避免排队请求继续撞旧地址。
Axios.interceptors.request.use(async (config) => {
  await awaitAddrReady();
  config.baseURL = getApiBaseURL();
  return config;
});

Axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 无 response：传输层失败，反馈给 ping 模块立即重探测，绕过默认轮询节奏
    if (!error.response) {
      notifyAddrFailure();
      return Promise.reject(error);
    }
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

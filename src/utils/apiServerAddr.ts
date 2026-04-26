/**
 * 运行时 API 服务器地址单例（模块加载即自管生命周期）。
 *
 * env 仅维护 host[:port]（serverAddr），协议由调用侧按 window.location.protocol 推导：
 * - HTTP 请求：getApiBaseURL() 返回 `${protocol}//${addr}/`
 * - WebSocket 等其它协议：调用侧自行用 getApiServerAddr() 拼接
 *
 * 初始化策略：
 * - dev / mock：直接读取 VITE_API_SERVER_ADDR；
 * - production：默认外网兜底，后台每分钟轮询校内 /ping，可达 → 切校内，
 *   失败/超时 → 回退外网。
 *
 * 模块加载时的副作用是有意为之：把"地址语义"和"地址生命周期"绑定在同一个模块，
 * Axios 等消费方只要 import 即用，无需在入口先调用初始化函数。
 */

const POLL_INTERVAL_MS = 60_000;

/**
 * 校园内网可达性探测。
 *
 * 用 fetch 而不是项目内的 axios：
 * - axios 实例的 baseURL 由本模块动态切换，复用它会形成自指；
 * - fetch 原生支持 AbortController，便于精准超时；
 * - 探测请求是绝对 URL，不依赖任何运行时单例。
 *
 * credentials: 'omit' + cache: 'no-store'：
 * - 避免带 Cookie 触发 401 副作用与复杂 CORS 预检；
 * - 避免命中浏览器/中间缓存导致探测结果失真。
 */
async function probeIntranet(
  serverAddr: string,
  pingPath: string,
  timeoutMs: number
): Promise<boolean> {
  const url = `${window.location.protocol}//${serverAddr}${pingPath}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

let serverAddr: string;

if (import.meta.env.MODE !== 'production') {
  serverAddr = import.meta.env.VITE_API_SERVER_ADDR;
} else {
  const intranet = import.meta.env.VITE_API_SERVER_ADDR_INTRANET;
  const extranet = import.meta.env.VITE_API_SERVER_ADDR_EXTRANET;
  const pingPath = import.meta.env.VITE_INTRANET_PING_PATH;
  const timeoutMs = Number(import.meta.env.VITE_NETWORK_PROBE_TIMEOUT);

  // 默认外网兜底，保证模块导入后任意请求即可发出，不阻塞首屏
  serverAddr = extranet;

  // 后台轮询：首次立即触发，避免内网用户在第一分钟内被锁在外网链路
  const tick = async () => {
    const reachable = await probeIntranet(intranet, pingPath, timeoutMs);
    serverAddr = reachable ? intranet : extranet;
  };
  void tick();
  window.setInterval(tick, POLL_INTERVAL_MS);
}

export function getApiServerAddr(): string {
  return serverAddr;
}

export function getApiBaseURL(): string {
  return `${window.location.protocol}//${getApiServerAddr()}/`;
}

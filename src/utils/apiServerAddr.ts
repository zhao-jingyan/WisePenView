/**
 * 运行时 API 服务器地址单例。
 *
 * - dev / mock：直接读 VITE_API_SERVER_ADDR。
 * - production：默认外网兜底，并发探测内/外网，可达者优先选内网；
 *   由「指数退避轮询 + 失败反馈 + 浏览器网络事件」三路驱动，
 *   避免"内 -> 外"切换被卡 1 分钟。
 *
 * 协议由调用侧按 window.location.protocol 推导，本模块只管 host[:port]。
 */

// 稳态后逐级拉长的轮询间隔；任何失败/网络事件回到 [0]。
const BACKOFF_SEQUENCE_MS = [1_000, 2_000, 5_000, 15_000, 60_000];

// awaitAddrReady 默认最长等待时间，略长于探测超时，避免用户感到卡死。
const ADDR_READY_AWAIT_MS = 1_500;

let serverAddr: string;

// production 专属配置；dev/mock 下保持初值，导出函数走快速路径。
let switchingEnabled = false;
let intranetAddr = '';
let extranetAddr = '';
let pingPath = '';
let probeTimeoutMs = 1_000;

// 当前 addr 是否被请求层/网络事件判定为可疑不可达。
let addrSuspectedDead = false;

// 进行中的探测，多源触发去重 + 供 awaitAddrReady 等待。
let probeInflight: Promise<void> | null = null;

// 退避索引：探测成功 +1（封顶），失败/事件归零。
let backoffIdx = 0;

let pollTimerId: number | null = null;

/**
 * 单一地址 ping。
 *
 * 用 fetch 不用 axios：avoid 自指（axios baseURL 由本模块切换）、原生 AbortController 精准超时、绝对 URL 不依赖运行时单例。
 * credentials: 'omit' + cache: 'no-store'：避免 Cookie 触发 401 副作用与 CORS 预检，避免命中缓存导致探测失真。
 */
async function probeOne(addr: string): Promise<boolean> {
  const url = `${window.location.protocol}//${addr}${pingPath}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), probeTimeoutMs);
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

/** 并发 ping 内/外网，按「内网优先 -> 外网兜底 -> 都挂保留旧值」决策。 */
async function probeBoth(): Promise<void> {
  const [intranetOk, extranetOk] = await Promise.all([
    probeOne(intranetAddr),
    probeOne(extranetAddr),
  ]);

  if (intranetOk) {
    serverAddr = intranetAddr;
    addrSuspectedDead = false;
    backoffIdx = Math.min(backoffIdx + 1, BACKOFF_SEQUENCE_MS.length - 1);
    return;
  }
  if (extranetOk) {
    serverAddr = extranetAddr;
    addrSuspectedDead = false;
    backoffIdx = Math.min(backoffIdx + 1, BACKOFF_SEQUENCE_MS.length - 1);
    return;
  }
  addrSuspectedDead = true;
  backoffIdx = 0;
}

function scheduleNextProbe(): void {
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
  }
  const delay = BACKOFF_SEQUENCE_MS[backoffIdx];
  pollTimerId = window.setTimeout(() => {
    pollTimerId = null;
    void runProbe();
  }, delay);
}

function runProbe(): Promise<void> {
  if (probeInflight) return probeInflight;
  probeInflight = (async () => {
    try {
      await probeBoth();
    } finally {
      probeInflight = null;
      scheduleNextProbe();
    }
  })();
  return probeInflight;
}

/** 清掉计划中的轮询、重置退避，立即探测。 */
function triggerImmediateProbe(): void {
  if (!switchingEnabled) return;
  backoffIdx = 0;
  if (pollTimerId !== null) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
  void runProbe();
}

/**
 * 请求层（axios 网络错误、WebSocket connection-error）告知"当前地址疑似挂了"。
 * 多源并发触发由 probeInflight 去重，单次探测周期内只跑一次。
 */
export function notifyAddrFailure(): void {
  if (!switchingEnabled) return;
  addrSuspectedDead = true;
  triggerImmediateProbe();
}

/**
 * 当 addr 可疑不可达且探测进行中时，短暂等待探测结果（最长 maxWaitMs）；
 * 健康路径立即返回。供 axios 请求拦截器使用，避免排队请求继续撞旧地址。
 */
export async function awaitAddrReady(maxWaitMs: number = ADDR_READY_AWAIT_MS): Promise<void> {
  if (!switchingEnabled) return;
  if (!addrSuspectedDead) return;
  const inflight = probeInflight;
  if (!inflight) return;
  await Promise.race([
    inflight,
    new Promise<void>((resolve) => window.setTimeout(resolve, maxWaitMs)),
  ]);
}

if (import.meta.env.MODE !== 'production') {
  serverAddr = import.meta.env.VITE_API_SERVER_ADDR;
} else {
  switchingEnabled = true;
  intranetAddr = import.meta.env.VITE_API_SERVER_ADDR_INTRANET;
  extranetAddr = import.meta.env.VITE_API_SERVER_ADDR_EXTRANET;
  pingPath = import.meta.env.VITE_INTRANET_PING_PATH;
  probeTimeoutMs = Number(import.meta.env.VITE_NETWORK_PROBE_TIMEOUT);

  // 外网兜底，保证模块导入即可发请求，不阻塞首屏
  serverAddr = extranetAddr;

  void runProbe();

  // 切 wifi、休眠唤醒等场景立即收敛
  window.addEventListener('online', () => {
    triggerImmediateProbe();
  });
  window.addEventListener('offline', () => {
    addrSuspectedDead = true;
    backoffIdx = 0;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerImmediateProbe();
    }
  });
}

export function getApiServerAddr(): string {
  return serverAddr;
}

export function getApiBaseURL(): string {
  return `${window.location.protocol}//${getApiServerAddr()}/`;
}

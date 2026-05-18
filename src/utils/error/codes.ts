/** 前端网络/传输层错误码（10–99） */
export const FRONTEND_NETWORK_ERROR = {
  TIMEOUT: 10,
  NETWORK: 11,
  CANCELED: 12,
  UNKNOWN: 99,
} as const;

/** 前端 Service/客户端校验错误码（100–999） */
export const FRONTEND_CLIENT_ERROR = {
  VALIDATION: 100,
  UNKNOWN: 999,
} as const;

export type FrontendNetworkErrorCode =
  (typeof FRONTEND_NETWORK_ERROR)[keyof typeof FRONTEND_NETWORK_ERROR];

export type FrontendClientErrorCode =
  (typeof FRONTEND_CLIENT_ERROR)[keyof typeof FRONTEND_CLIENT_ERROR];

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // dev / mock 模式（单一 host[:port]）
  readonly VITE_API_SERVER_ADDR: string;
  // production 模式（双 host[:port] + ping 探针路径 + 探测超时）
  readonly VITE_API_SERVER_ADDR_INTRANET: string;
  readonly VITE_API_SERVER_ADDR_EXTRANET: string;
  readonly VITE_INTRANET_PING_PATH: string;
  readonly VITE_NETWORK_PROBE_TIMEOUT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API 地址
  readonly VITE_API_BASE_URL: string;
  // 开发流量标识
  readonly VITE_X_DEVELOPER?: string;
  // 笔记协同地址
  readonly VITE_NOTE_COLLAB_WS_URL: string;
  // 可选：DrawIO 编辑器入口 URL，未配置时使用官方 embed.diagrams.net
  readonly VITE_DRAWIO_EMBED_URL?: string;
  // ONLYOFFICE Document Server 前端访问地址
  readonly VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { WebsocketProvider } from 'y-websocket';
import { baseServerAddr } from '@/utils/Axios';
import * as Y from 'yjs';

export function getNoteUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${baseServerAddr}/note-collab`;
}

/**
 * 笔记协同 WebSocket：在 y-websocket 上固定 path、query（resourceId），并支持发送意图元数据帧。
 * 与 HTTP 类 NoteService 分离，供 EditorRoom 等协同层使用。
 */
export class WisepenProvider extends WebsocketProvider {
  constructor(resourceId: string, doc: Y.Doc, options?: { connect?: boolean }) {
    // y-websocket 默认把第二参数拼在 URL 后；传 'ws' 最终形如 ws://host/note-collab/ws?resourceId=...
    // connect: false 时由调用方在注册好 status/sync 监听后再 connect()，避免本地极快连上时错过 connected 事件
    super(getNoteUrl(), 'ws', doc, {
      connect: options?.connect ?? true,
      disableBc: true,
      params: {
        resourceId,
      },
    });
  }

  sendIntent(
    operationType: 'COPY' | 'PASTE' | 'UNDO' | 'REDO' | 'KEYBOARD' | 'OTHER',
    source?: string
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const intentMsg = JSON.stringify({
        type: 'meta',
        intent: { operationType, source },
      });
      this.ws.send(intentMsg);
    }
  }
}

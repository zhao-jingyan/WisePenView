/** 行内批注列表同步世代：本地写操作后递增，用于丢弃过期的 list 响应，避免误删 thread/sidecar。 */
let inlineCommentListSyncEpoch = 0;

export function bumpInlineCommentListSyncEpoch(): void {
  inlineCommentListSyncEpoch += 1;
}

export function getInlineCommentListSyncEpoch(): number {
  return inlineCommentListSyncEpoch;
}

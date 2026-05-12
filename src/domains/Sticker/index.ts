// 在flatDrive中，扁平化的tag被我们抽象为sticker（贴纸），针对贴纸，我们忽略其树形结构，直接使用扁平化的数据结构。
export type {
  AddStickerRequest,
  DeleteStickerRequest,
  IStickerService,
  Sticker,
  UpdateResourceStickersRequest,
  UpdateStickerRequest,
} from './service/index.type';

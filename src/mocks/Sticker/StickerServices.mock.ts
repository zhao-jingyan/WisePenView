import type {
  IStickerService,
  Sticker,
  AddStickerRequest,
  UpdateStickerRequest,
  DeleteStickerRequest,
  UpdateResourceStickersRequest,
} from '@/services/Sticker';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockStickers: Sticker[] = [
  { tagId: 'mock-sticker-1', tagName: '重要' },
  { tagId: 'mock-sticker-2', tagName: '待办' },
  { tagId: 'mock-sticker-3', tagName: '参考资料' },
  { tagId: 'mock-sticker-4', tagName: '已归档' },
];

const getStickerList = async (): Promise<Sticker[]> => {
  await delay(200);
  return mockStickers;
};

const addSticker = async (_params: AddStickerRequest): Promise<void> => {
  await delay(200);
};

const updateSticker = async (_params: UpdateStickerRequest): Promise<void> => {
  await delay(150);
};

const deleteSticker = async (_params: DeleteStickerRequest): Promise<void> => {
  await delay(150);
};

const updateResourceStickers = async (_params: UpdateResourceStickersRequest): Promise<void> => {
  await delay(150);
};

export const StickerServicesMock: IStickerService = {
  getStickerList,
  addSticker,
  updateSticker,
  deleteSticker,
  updateResourceStickers,
};

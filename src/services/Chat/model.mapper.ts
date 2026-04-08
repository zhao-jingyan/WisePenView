import { MODEL_TYPE } from '@/types/model';
import type { Model } from '@/components/ChatPanel/index.type';
import type { ModelListResponse } from './index.type';

/**
 * 将后端模型分组响应拍平并适配为当前 ChatPanel 需要的模型结构。
 */
export const mapApiModelsToFlatModels = (data?: ModelListResponse): Model[] => {
  if (!data) return [];

  const groupedModels = [...data.standard_models, ...data.advanced_models, ...data.other_models];
  return groupedModels.map((item, index) => ({
    id: item.id,
    name: item.name,
    provider: 'openai',
    tags: item.is_default ? [{ text: 'Default', type: 'blue' }] : [],
    multiplier: item.ratio > 1 ? `${item.ratio}x` : null,
    vision: false,
    usageRank: index + 1,
    category:
      item.type === MODEL_TYPE.ADVANCED_MODEL
        ? 'reasoning'
        : item.type === MODEL_TYPE.STANDARD_MODEL
          ? 'all-round'
          : 'chat',
  }));
};

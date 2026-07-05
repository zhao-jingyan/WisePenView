import type { Model } from '../index.type';

export interface ModelSelectorTag {
  text: string;
  type: string;
}

export interface ModelSelectorModelView {
  providerText: string;
  tags: ModelSelectorTag[];
  multiplierText: string | null;
}

export const getModelProviderText = (model: Model): string => {
  if (model.providerName && model.providerModelName) {
    return `${model.providerName} · ${model.providerModelName}`;
  }
  return model.providerModelName || model.providerName || model.provider;
};

const getCurrentProviderOption = (model: Model) => {
  if (!model.providerId) return undefined;
  return model.providerOptions.find((option) => option.providerId === model.providerId);
};

export const buildModelSelectorModelView = (model: Model): ModelSelectorModelView => {
  const tags: ModelSelectorTag[] = [];
  if (model.isDefault) {
    tags.push({ text: 'Default', type: 'blue' });
  }
  if (model.supportThinking) {
    tags.push({ text: 'Thinking', type: 'purple' });
  }
  if (model.vision) {
    tags.push({ text: 'Vision', type: 'green' });
  }
  if (getCurrentProviderOption(model)?.isPreferred) {
    tags.push({ text: 'Preferred', type: 'blue' });
  }

  return {
    providerText: getModelProviderText(model),
    tags,
    multiplierText: model.ratio >= 1 ? `${model.ratio}x 消耗` : null,
  };
};

import { Popover } from '@/components/Overlay';
import { Chip, Dropdown, Spinner } from '@heroui/react';
import { useRequest, useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { ArrowUpAZ, ChartBar, Check, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/Feedback';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import { useChatService } from '@/domains';
import { useChatModelPreferenceStore } from '@/store/useChatModelPreferenceStore';
import type { Model } from '../index.type';

import styles from './style.module.less';

const SORT_OPTIONS = [
  { label: '按费率', value: 'ratio', icon: ChartBar },
  { label: '按名字', value: 'name', icon: ArrowUpAZ },
  { label: '深度思考模型', value: 'thinking', icon: LayoutGrid },
];

const renderProviderText = (model: Model): string => {
  if (model.providerName && model.providerModelName) {
    return `${model.providerName} · ${model.providerModelName}`;
  }
  return model.providerModelName || model.providerName || model.provider;
};

interface ModelSelectorProps {
  value: string;
  onChange: (model: Model) => void;
}

function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<string>('ratio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const lastSelectedModelId = useChatModelPreferenceStore((state) => state.lastSelectedModelId);
  const setLastSelectedModelId = useChatModelPreferenceStore(
    (state) => state.setLastSelectedModelId
  );
  const chatService = useChatService();
  const { data: models = [], loading } = useRequest(() => chatService.getModels());

  // 初始化优先使用上次选择，不存在则回退默认模型。
  useUpdateEffect(() => {
    if (!loading && models.length > 0) {
      const targetModel = models.find((m) => m.id === value);
      if (targetModel) {
        if (lastSelectedModelId !== targetModel.id) {
          setLastSelectedModelId(targetModel.id);
        }
        return;
      }

      const preferredModel = lastSelectedModelId
        ? models.find((m) => m.id === lastSelectedModelId)
        : undefined;
      const defaultModel = models.find((m) => m.isDefault);
      const nextModel = preferredModel ?? defaultModel ?? models[0];
      onChange(nextModel);
      if (lastSelectedModelId !== nextModel.id) {
        setLastSelectedModelId(nextModel.id);
      }
    }
  }, [lastSelectedModelId, loading, models, onChange, setLastSelectedModelId, value]);

  const currentModel = useMemo(
    () => models.find((m) => m.id === value) || models.find((m) => m.isDefault) || models[0],
    [value, models]
  );

  const listTitle = useMemo(() => {
    const map: Record<string, string> = {
      ratio: '模型列表（按费率）',
      name: '模型列表（按名字）',
      thinking: '深度思考模型',
    };
    return map[currentSort] || '模型列表';
  }, [currentSort]);

  const processedModels = useMemo(() => {
    const list = [...models];
    const direction = sortOrder === 'asc' ? 1 : -1;
    switch (currentSort) {
      case 'ratio':
        return list.sort((a, b) => (a.ratio - b.ratio) * direction || a.name.localeCompare(b.name));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name) * direction);
      case 'thinking':
        return list
          .filter((m) => m.supportThinking)
          .sort((a, b) => (a.ratio - b.ratio) * direction || a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [currentSort, models, sortOrder]);

  const renderContent = () => (
    <div className={styles.selectorPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.headerTitle}>{listTitle}</span>
        <div className={styles.sortActions}>
          <button
            type="button"
            className={styles.sortOrderBtn}
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            aria-label={sortOrder === 'asc' ? '切换为降序' : '切换为升序'}
          >
            {sortOrder === 'asc' ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
            {sortOrder === 'asc' ? '升序' : '降序'}
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <button type="button" className={styles.sortTrigger}>
                {SORT_OPTIONS.find((o) => o.value === currentSort)?.label}
                <ChevronDown size={10} aria-hidden="true" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className={styles.sortDropdownPopover}>
              <Dropdown.Menu
                aria-label="模型排序方式"
                selectedKeys={[currentSort]}
                selectionMode="single"
                onAction={(key) => setCurrentSort(String(key))}
              >
                {SORT_OPTIONS.map((opt) => (
                  <Dropdown.Item
                    key={opt.value}
                    id={opt.value}
                    textValue={opt.label}
                    className={styles.sortDropdownItem}
                  >
                    <opt.icon size={14} aria-hidden="true" />
                    <span>{opt.label}</span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className={styles.modelList}>
        {loading ? (
          <div className={styles.loadingWrap}>
            <Spinner size="sm" />
          </div>
        ) : processedModels.length === 0 ? (
          <div className={styles.emptyWrap}>
            <EmptyState title="暂无模型" />
          </div>
        ) : (
          processedModels.map((model, index) => (
            <div
              key={model.id}
              className={clsx(styles.modelItem, model.id === value && styles.active)}
              onClick={() => {
                onChange(model);
                setLastSelectedModelId(model.id);
                setOpen(false);
              }}
            >
              {currentSort === 'ratio' && <div className={styles.rankNum}>#{index + 1}</div>}

              <div className={styles.itemLeft}>
                <span className={styles.modelTitle}>
                  <span className={styles.modelTitleIcon} aria-hidden="true">
                    <ProviderLogo provider={model.provider} size={20} />
                  </span>
                  <span className={styles.modelName}>{model.name}</span>
                </span>

                {/* {model.vision && (
                  <Tooltip title="支持视觉识别" classNames={{ container: styles.tooltipBody }}>
                    <div className={styles.visionWrapper}>
                      <Eye />
                    </div>
                  </Tooltip>
                )} */}

                <div className={styles.tagsRow}>
                  <Chip size="sm" variant="soft" className={styles.miniTag}>
                    <Chip.Label>{renderProviderText(model)}</Chip.Label>
                  </Chip>
                  {model.tags.map((tag, idx) => (
                    <Chip key={idx} size="sm" variant="soft" className={styles.miniTag}>
                      <Chip.Label>{tag.text}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              </div>

              <div className={styles.itemRight}>
                {model.multiplier && (
                  <Chip size="sm" variant="soft" className={styles.multiplierTag}>
                    <Chip.Label>{model.multiplier}</Chip.Label>
                  </Chip>
                )}
                {model.id === value && <Check style={{ color: 'var(--accent)' }} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button type="button" className={styles.trigger}>
          {/* 如果正在加载，显示 Loading 图标或占位符 */}
          <span className={styles.triggerModel}>
            <span className={styles.triggerModelIcon} aria-hidden="true">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <ProviderLogo provider={currentModel?.provider ?? 'openai'} size={16} />
              )}
            </span>
            <span className={styles.triggerModelName}>
              {loading ? '模型加载中' : (currentModel?.name ?? '请选择模型')}
            </span>
          </span>
          <ChevronDown className={styles.triggerArrow} size={10} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.popoverBody} placement="bottom">
        <Popover.Dialog>
          <Popover.DeferredContent fallback={<div className={styles.selectorPanelDeferred} />}>
            {renderContent}
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ModelSelector;

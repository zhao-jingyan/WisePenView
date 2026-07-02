import { ListBox, ListBoxItem, Popover } from '@heroui/react';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';
import ProviderLogo from '../ProviderLogo';
import type { ModelPickerProps } from './index.type';
import styles from '../style.module.less';

function ModelPicker({
  open,
  loading,
  models,
  selectedModel,
  onOpenChange,
  onChange,
}: ModelPickerProps) {
  return (
    <Popover isOpen={open} onOpenChange={onOpenChange}>
      <Popover.Trigger>
        <button type="button" className={styles.modelTrigger} aria-label="选择模型">
          {loading ? (
            <LoaderCircle size={16} className={styles.spinIcon} />
          ) : (
            <ProviderLogo provider={selectedModel?.provider ?? 'openai'} size={16} />
          )}
          <span>{loading ? '模型加载中' : (selectedModel?.name ?? '选择模型')}</span>
          <ChevronDown size={12} />
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <div className={styles.modelMenu}>
            <div className={styles.popoverTitle}>模型</div>
            {models.length === 0 ? (
              <div className={styles.emptyText}>暂无模型</div>
            ) : (
              <ListBox
                aria-label="选择模型"
                selectionMode="single"
                selectedKeys={selectedModel ? [selectedModel.id] : []}
                className={styles.listBox}
              >
                {models.map((model) => (
                  <ListBoxItem
                    key={model.id}
                    id={model.id}
                    textValue={model.name}
                    onPress={() => onChange(model)}
                  >
                    <span className={styles.modelItem}>
                      <ProviderLogo provider={model.provider} size={18} />
                      <span className={styles.modelInfo}>
                        <span className={styles.modelName}>{model.name}</span>
                        <span className={styles.modelMeta}>{model.provider}</span>
                      </span>
                      {selectedModel?.id === model.id ? (
                        <Check size={14} className={styles.checkIcon} />
                      ) : null}
                    </span>
                  </ListBoxItem>
                ))}
              </ListBox>
            )}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ModelPicker;

import { Button, ListBox, ListBoxItem, Popover } from '@heroui/react';
import { Check, Settings, Sparkles, Wrench } from 'lucide-react';
import type { CapabilityMenuProps } from './index.type';
import styles from '../style.module.less';

function CapabilityMenu({
  open,
  capabilityCount,
  sections,
  selectedSkills,
  selectedTools,
  onOpenChange,
  onToggleSkill,
  onToggleTool,
  onRemoveSkill,
  onSelectOther,
}: CapabilityMenuProps) {
  const primarySection = sections.find((section) => section.key === 'primary-skills');
  const externalSection = sections.find((section) => section.key === 'external-skills');
  const toolSection = sections.find((section) => section.key === 'tools');
  const selectedSkillIds = selectedSkills.map((skill) => skill.skillId);
  const selectedToolIds = selectedTools.map((tool) => tool.toolId);
  const externalItems = externalSection?.items.filter((item) => item.kind === 'external-skill') ?? [];

  return (
    <Popover isOpen={open} onOpenChange={onOpenChange}>
      <Popover.Trigger>
        <span className={styles.toolButtonWrap}>
          {capabilityCount > 0 ? <span className={styles.capabilityBadge}>{capabilityCount}</span> : null}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className={styles.toolbarCircleBtn}
            aria-label="配置 Agent"
            title="配置 Agent"
          >
            <Settings size={17} />
          </Button>
        </span>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <div className={styles.capabilityPanel}>
            {primarySection && primarySection.items.length > 0 ? (
              <>
                <div className={styles.popoverTitle}>Skill</div>
                <ListBox
                  aria-label="选择 Skill"
                  selectionMode="multiple"
                  selectedKeys={selectedSkillIds}
                  className={styles.listBox}
                >
                  {primarySection.items.map((item) => (
                    <ListBoxItem
                      key={item.key}
                      id={item.key}
                      textValue={item.label}
                      onPress={() => onToggleSkill(item.key)}
                    >
                      <span className={styles.listItemContent}>
                        <Sparkles size={15} />
                        <span>{item.label}</span>
                        {selectedSkillIds.includes(item.key) ? (
                          <Check size={14} className={styles.checkIcon} />
                        ) : null}
                      </span>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </>
            ) : null}

            {externalItems.length > 0 ? (
              <>
                <div className={styles.popoverTitle}>其他 Skill</div>
                <ListBox
                  aria-label="已选择的其他 Skill"
                  selectionMode="multiple"
                  selectedKeys={externalItems.map((item) => item.key)}
                  className={styles.listBox}
                >
                  {externalItems.map((item) => (
                    <ListBoxItem
                      key={item.key}
                      id={item.key}
                      textValue={item.label}
                      onPress={() => onRemoveSkill(item.key)}
                    >
                      <span className={styles.listItemContent}>
                        <Sparkles size={15} />
                        <span>
                          {item.label}
                          {item.sourceText ? (
                            <span className={styles.capabilitySourceText}>{item.sourceText}</span>
                          ) : null}
                        </span>
                        <Check size={14} className={styles.checkIcon} />
                      </span>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              className={styles.fullWidthButton}
              onPress={onSelectOther}
            >
              选择其他 Skill...
            </Button>

            {toolSection && toolSection.items.length > 0 ? (
              <>
                <div className={styles.popoverTitle}>工具</div>
                <ListBox
                  aria-label="选择工具"
                  selectionMode="multiple"
                  selectedKeys={selectedToolIds}
                  className={styles.listBox}
                >
                  {toolSection.items.map((item) => (
                    <ListBoxItem
                      key={item.key}
                      id={item.key}
                      textValue={item.label}
                      onPress={() => onToggleTool(item.key)}
                    >
                      <span className={styles.listItemContent}>
                        <Wrench size={15} />
                        <span>{item.label}</span>
                        {selectedToolIds.includes(item.key) ? (
                          <Check size={14} className={styles.checkIcon} />
                        ) : null}
                      </span>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </>
            ) : null}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default CapabilityMenu;

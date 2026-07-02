import type { ChatAgentOption } from '@/store';
import { Button, ListBox, ListBoxItem, Popover } from '@heroui/react';
import { Bot, Check } from 'lucide-react';
import { useState } from 'react';
import type { AgentPickerProps } from './index.type';
import styles from '../style.module.less';

function AgentPicker({ selectedAgent, agents, onChange }: AgentPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (agent: ChatAgentOption) => {
    onChange(agent);
    setOpen(false);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className={styles.toolbarCircleBtn}
          aria-label="选择 Agent"
          title={selectedAgent.label}
        >
          <Bot size={17} />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <div className={styles.popoverPanel}>
            <div className={styles.popoverTitle}>Agent</div>
            <ListBox
              aria-label="选择 Agent"
              selectionMode="single"
              selectedKeys={[selectedAgent.agentId]}
              className={styles.listBox}
            >
              {agents.map((agent) => (
                <ListBoxItem
                  key={agent.agentId}
                  id={agent.agentId}
                  textValue={agent.label}
                  onPress={() => handleSelect(agent)}
                >
                  <span className={styles.agentItem}>
                    <span className={styles.agentMain}>
                      <Bot size={14} />
                      <span>{agent.label}</span>
                    </span>
                    {agent.agentType === 'GROUP' && agent.groupName ? (
                      <span className={styles.agentMeta}>{agent.groupName}</span>
                    ) : null}
                    {selectedAgent.agentId === agent.agentId ? (
                      <Check size={14} className={styles.checkIcon} />
                    ) : null}
                  </span>
                </ListBoxItem>
              ))}
            </ListBox>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default AgentPicker;

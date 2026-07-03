import { Popover } from '@/components/Overlay';
import { useChatService } from '@/domains';
import { buildChatInputAgentOptions, resolveChatInputSelectedAgent } from '@/domains/Chat';
import type { ChatAgentOption } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox, ListBoxItem, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Bot, Check } from 'lucide-react';
import { useState } from 'react';
import { useChatInputStore, useChatInputStoreApi } from '../ChatInputStore';
import styles from '../style.module.less';

function AgentPicker() {
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const selectedAgent = useChatInputStore((state) => state.selectedAgent);
  const { setSelectedAgent } = store.getState();
  const [open, setOpen] = useState(false);
  const { data: agents = [] } = useRequest(() => chatService.getChatInputAgents(), {
    onSuccess: (nextAgents) => {
      const currentAgent = store.getState().selectedAgent;
      const nextAgent = resolveChatInputSelectedAgent(nextAgents, currentAgent);
      if (nextAgent.agentId !== currentAgent.agentId) {
        setSelectedAgent(nextAgent);
      }
    },
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });
  const displayAgents = buildChatInputAgentOptions(agents, selectedAgent);

  const handleSelect = (agent: ChatAgentOption) => {
    setSelectedAgent(agent);
    setOpen(false);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger title={selectedAgent.label}>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className={styles.toolbarCircleBtn}
          aria-label="选择 Agent"
        >
          <Bot size={17} />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.toolbarPopover} placement="top">
        <Popover.Dialog>
          <Popover.DeferredContent fallback={<div className={styles.deferredPopoverPanel} />}>
            {() => (
              <div className={styles.popoverPanel}>
                <div className={styles.popoverTitle}>Agent</div>
                <ListBox
                  aria-label="选择 Agent"
                  selectionMode="single"
                  selectedKeys={[selectedAgent.agentId]}
                  className={styles.listBox}
                >
                  {displayAgents.map((agent) => (
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
            )}
          </Popover.DeferredContent>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default AgentPicker;

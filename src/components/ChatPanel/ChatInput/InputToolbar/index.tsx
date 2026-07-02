import { Button } from '@heroui/react';
import { Send } from 'lucide-react';
import AgentPicker from '../AgentPicker';
import CapabilityMenu from '../CapabilityMenu';
import ModelPicker from '../ModelPicker';
import UploadMenu from '../UploadMenu';
import type { InputToolbarProps } from './index.type';
import styles from '../style.module.less';

function InputToolbar({
  attachmentOpen,
  capabilityOpen,
  modelOpen,
  agentOptions,
  selectedAgent,
  selectedModel,
  models,
  modelsLoading,
  selectedSkills,
  selectedTools,
  capabilitySections,
  sendDisabled,
  onAttachmentOpenChange,
  onCapabilityOpenChange,
  onModelOpenChange,
  onLocalAttachPress,
  onCloudAttachPress,
  onAgentChange,
  onModelChange,
  onToggleSkill,
  onToggleTool,
  onRemoveSkill,
  onSelectOtherSkill,
  onSend,
}: InputToolbarProps) {
  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        <UploadMenu
          open={attachmentOpen}
          onOpenChange={onAttachmentOpenChange}
          onLocalPress={onLocalAttachPress}
          onCloudPress={onCloudAttachPress}
        />
        <AgentPicker selectedAgent={selectedAgent} agents={agentOptions} onChange={onAgentChange} />
        <CapabilityMenu
          open={capabilityOpen}
          capabilityCount={selectedSkills.length + selectedTools.length}
          sections={capabilitySections}
          selectedSkills={selectedSkills}
          selectedTools={selectedTools}
          onOpenChange={onCapabilityOpenChange}
          onToggleSkill={onToggleSkill}
          onToggleTool={onToggleTool}
          onRemoveSkill={onRemoveSkill}
          onSelectOther={onSelectOtherSkill}
        />
      </div>

      <div className={styles.toolsRight}>
        <div className={styles.modelSelectorShell}>
          <ModelPicker
            open={modelOpen}
            loading={modelsLoading}
            models={models}
            selectedModel={selectedModel}
            onOpenChange={onModelOpenChange}
            onChange={onModelChange}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          isIconOnly
          onPress={onSend}
          isDisabled={sendDisabled}
          className={styles.toolbarCircleBtn}
          aria-label="发送消息"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
}

export default InputToolbar;

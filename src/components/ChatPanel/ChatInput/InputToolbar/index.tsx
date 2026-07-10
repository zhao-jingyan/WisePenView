import { Button } from '@heroui/react';
import { ArrowUp } from 'lucide-react';
import AgentPicker from '../AgentPicker';
import ModelPicker from '../ModelPicker';
import SkillMenu from '../SkillMenu';
import styles from '../style.module.less';
import UploadMenu from '../UploadMenu';
import type { InputToolbarProps } from './index.type';

function InputToolbar({ sendDisabled, onSend }: InputToolbarProps) {
  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        <UploadMenu />
        <AgentPicker />
        <SkillMenu />
      </div>

      <div className={styles.toolsRight}>
        <div className={styles.modelSelectorShell}>
          <ModelPicker />
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
          <ArrowUp size={18} />
        </Button>
      </div>
    </div>
  );
}

export default InputToolbar;

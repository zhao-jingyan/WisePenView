import { Badge, Button, Dropdown } from 'antd';
import { Plus, Send, Wrench } from 'lucide-react';
import ModelSelector from '../../ModelSelector';
import styles from '../style.module.less';
import type { ActionToolbarProps } from './index.type';

function ActionToolbar({
  modelValue,
  onModelChange,
  onSend,
  disabledSend,
  capabilityCount,
  capabilityOpen,
  onCapabilityOpenChange,
  capabilityDropdownContent,
  contentPickOpen,
  onContentPickOpenChange,
  contentPickDropdownContent,
  getPopupContainer,
}: ActionToolbarProps) {
  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        <Dropdown
          open={contentPickOpen}
          onOpenChange={onContentPickOpenChange}
          trigger={['click']}
          dropdownRender={() => contentPickDropdownContent}
          placement="topLeft"
          overlayStyle={{ padding: 0 }}
          getPopupContainer={getPopupContainer}
        >
          <Button
            shape="circle"
            icon={<Plus size={18} />}
            className={styles.toolbarCircleBtn}
            aria-label="添加内容"
          />
        </Dropdown>

        <Dropdown
          open={capabilityOpen}
          onOpenChange={onCapabilityOpenChange}
          trigger={['click']}
          dropdownRender={() => capabilityDropdownContent}
          placement="topLeft"
          overlayStyle={{ padding: 0 }}
          getPopupContainer={getPopupContainer}
        >
          <Badge
            count={capabilityCount}
            size="small"
            offset={[-4, 4]}
            color="var(--ant-color-info)"
          >
            <Button icon={<Wrench size={16} />} className={styles.capabilityButton}>
              能力
            </Button>
          </Badge>
        </Dropdown>
      </div>

      <div className={styles.toolsRight}>
        <ModelSelector value={modelValue} onChange={onModelChange} />

        <Button
          shape="circle"
          onClick={onSend}
          disabled={disabledSend}
          className={styles.toolbarCircleBtn}
          icon={<Send size={18} />}
        />
      </div>
    </div>
  );
}

export default ActionToolbar;

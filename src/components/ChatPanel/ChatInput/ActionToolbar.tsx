import { Button } from 'antd';
import React from 'react';
import { LuSend } from 'react-icons/lu';

import type { Model } from '@/components/ChatPanel/index.type';
import ModelSelector from '../ModelSelector';
import styles from './style.module.less';

interface ActionToolbarProps {
  modelValue: string;
  onModelChange: (model: Model) => void;
  onSend: () => void;
  disabledSend: boolean;
}

const ActionToolbar: React.FC<ActionToolbarProps> = ({
  modelValue,
  onModelChange,
  onSend,
  disabledSend,
}) => {
  return (
    <div className={styles.actionToolbar}>
      {/* 左侧功能区 */}
      <div className={styles.toolsLeft}>
        {/* TODO: 以下按钮功能待接入 */}
        {/* <Tooltip title="上传文件">
          <Button
            type="text"
            size="small"
            shape="circle"
            className={styles.toolBtn} // 只需要一个类名控制颜色
            icon={<LuPlus />}
          />
        </Tooltip>

        <Tooltip title="设置">
          <Button
            type="text"
            size="small"
            shape="circle"
            className={styles.toolBtn}
            icon={<LuSettings />}
          />
        </Tooltip>

        <Tooltip title="历史记录">
          <Button
            type="text"
            size="small"
            shape="circle"
            className={styles.toolBtn}
            icon={<LuHistory />}
          />
        </Tooltip> */}
      </div>

      {/* 右侧功能区 */}
      <div className={styles.toolsRight}>
        <ModelSelector value={modelValue} onChange={onModelChange} />

        <Button
          type="primary"
          shape="circle"
          size="small"
          onClick={onSend}
          disabled={disabledSend}
          className={styles.sendBtn}
          icon={<LuSend size={14} />}
        />
      </div>
    </div>
  );
};

export default ActionToolbar;

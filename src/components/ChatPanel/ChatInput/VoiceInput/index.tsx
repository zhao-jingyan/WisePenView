import { Button, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { LoaderCircle, Mic, Square } from 'lucide-react';
import styles from '../style.module.less';
import type { VoiceInputProps } from './index.type';

const STATE_LABELS: Record<VoiceInputProps['state'], string> = {
  idle: '语音输入',
  requestingPermission: '正在请求麦克风权限',
  issuingCredential: '正在准备语音识别',
  connecting: '正在连接语音识别',
  listening: '停止语音输入',
  finishing: '正在结束语音输入',
};

function VoiceInput({ state, isActive, isDisabled, onPress }: VoiceInputProps) {
  const label = STATE_LABELS[state];
  const isLoading =
    state === 'requestingPermission' ||
    state === 'issuingCredential' ||
    state === 'connecting' ||
    state === 'finishing';

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          isDisabled={isDisabled}
          onPress={onPress}
          className={clsx(styles.toolbarCircleBtn, isActive && styles.voiceButtonActive)}
          aria-label={label}
          aria-pressed={isActive}
        >
          {isLoading ? (
            <LoaderCircle size={17} className={styles.spinIcon} />
          ) : state === 'listening' ? (
            <Square size={14} fill="currentColor" />
          ) : (
            <Mic size={18} />
          )}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

export default VoiceInput;
export type { VoiceInputProps, VoiceInputState } from './index.type';

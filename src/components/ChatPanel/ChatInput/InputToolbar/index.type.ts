import type { VoiceInputProps } from '../VoiceInput';

export interface InputToolbarProps {
  sendDisabled: boolean;
  voiceInputProps: VoiceInputProps;
  onSend: () => void;
}

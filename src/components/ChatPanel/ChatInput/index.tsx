import { TextArea } from '@heroui/react';
import AttachmentStrip from './AttachmentStrip';
import { ChatInputFileProvider } from './ChatInputFileContext';
import { ChatInputStoreProvider } from './ChatInputStoreProvider';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import type { ChatInputProps } from './index.type';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import styles from './style.module.less';
import { useChatInputController } from './useChatInputController';

function ChatInputContent({ onSend, sending }: ChatInputProps) {
  const { attachmentStripProps, containerProps, dropOverlayProps, textAreaProps, toolbarProps } =
    useChatInputController({
      onSend,
      sending,
    });

  return (
    <div className={styles.container} {...containerProps}>
      <div className={styles.inputCard}>
        <DropOverlay {...dropOverlayProps} />

        <AttachmentStrip {...attachmentStripProps} />

        <TextArea
          {...textAreaProps}
          placeholder="输入消息..."
          rows={1}
          className={styles.textarea}
        />

        <InputToolbar {...toolbarProps} />
      </div>

      <OtherSkillModal />

      <DocumentPickerModal />

      <div className={styles.footerTip}>AI 内容仅供参考，请仔细甄别</div>
    </div>
  );
}

function ChatInput(props: ChatInputProps) {
  return (
    <ChatInputStoreProvider>
      <ChatInputFileProvider getUploadSessionId={props.getUploadSessionId}>
        <ChatInputContent {...props} />
      </ChatInputFileProvider>
    </ChatInputStoreProvider>
  );
}

export default ChatInput;

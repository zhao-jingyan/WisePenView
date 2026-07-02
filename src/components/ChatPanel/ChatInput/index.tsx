import { TextArea } from '@heroui/react';
import AttachmentStrip from './AttachmentStrip';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import type { ChatInputProps } from './index.type';
import styles from './style.module.less';
import { useChatInputController } from './useChatInputController';

function ChatInput({
  onSend,
  sending,
  hasSelectedContext,
  selectedContextText,
  onClearSelectedContext,
}: ChatInputProps) {
  const controller = useChatInputController({
    onSend,
    sending,
    selectedContextText,
  });

  return (
    <div
      className={styles.container}
      onDragEnter={controller.handleDragEnter}
      onDragOver={controller.handleDragOver}
      onDragLeave={controller.handleDragLeave}
      onDrop={controller.handleDrop}
    >
      <div className={styles.inputCard}>
        <DropOverlay visible={controller.isDragOver} />

        <AttachmentStrip
          selectedContextText={selectedContextText}
          selectedPreview={controller.selectedPreview}
          hasSelectedContext={hasSelectedContext}
          resources={controller.activeDocRefs}
          attachments={controller.activeAttachments}
          images={controller.pendingImageMetas}
          uploads={controller.pendingAttachmentUploads}
          skills={controller.selectedSkills}
          tools={controller.selectedTools}
          onClearSelectedContext={onClearSelectedContext}
          onRemoveResource={controller.removeDocRef}
          onRemoveAttachment={controller.removeAttachment}
          onRemoveImage={controller.removePendingImage}
          onRemoveUpload={controller.removeUpload}
          onRemoveSkill={controller.removeSkill}
          onRemoveTool={controller.removeTool}
        />

        <TextArea
          value={controller.value}
          onChange={(e) => controller.setValue(e.target.value)}
          placeholder="输入消息..."
          rows={1}
          className={styles.textarea}
          onKeyDown={controller.handleKeyDown}
          onCompositionStart={() => controller.setIsComposing(true)}
          onCompositionEnd={() => controller.setIsComposing(false)}
          onPaste={controller.handlePaste}
        />

        <InputToolbar
          attachmentOpen={controller.attachmentOpen}
          capabilityOpen={controller.capabilityOpen}
          modelOpen={controller.modelOpen}
          agentOptions={controller.agentOptions}
          selectedAgent={controller.selectedAgent}
          selectedModel={controller.selectedModel}
          models={controller.models}
          modelsLoading={controller.modelsLoading}
          selectedSkills={controller.selectedSkills}
          selectedTools={controller.selectedTools}
          capabilitySections={controller.capabilitySections}
          sendDisabled={controller.sendDisabled}
          onAttachmentOpenChange={controller.setAttachmentOpen}
          onCapabilityOpenChange={controller.setCapabilityOpen}
          onModelOpenChange={controller.setModelOpen}
          onLocalAttachPress={controller.openUploadPicker}
          onCloudAttachPress={controller.openDocumentPicker}
          onAgentChange={controller.setSelectedAgent}
          onModelChange={controller.handleModelChange}
          onToggleSkill={controller.toggleSkill}
          onToggleTool={controller.toggleTool}
          onRemoveSkill={controller.removeSkill}
          onSelectOtherSkill={controller.openOtherSkillModal}
          onSend={() => void controller.handleSend()}
        />
      </div>

      <input
        ref={controller.fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={controller.handleFileInputChange}
      />

      <OtherSkillModal
        open={controller.otherSkillModalOpen}
        groups={controller.otherSkillGroups}
        currentAgent={controller.selectedAgent}
        selectedSkills={controller.selectedSkills}
        onClose={() => controller.setOtherSkillModalOpen(false)}
        onConfirm={controller.handleOtherSkillConfirm}
      />

      <DocumentPickerModal
        open={controller.documentPickerOpen}
        onClose={() => controller.setDocumentPickerOpen(false)}
        onConfirm={controller.addDocRefs}
      />

      <div className={styles.footerTip}>
        {controller.workspaceLoading ? '正在加载可用 Agent' : 'AI 内容仅供参考，请仔细甄别'}
      </div>
    </div>
  );
}

export default ChatInput;

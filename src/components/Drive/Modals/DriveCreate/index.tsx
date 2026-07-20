import { FormField, Input, TextArea } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import AppModal from '@/components/Overlay/AppModal';
import { useAgentService, useDriveService, useNoteService, useSkillService } from '@/domains';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { Button, Label, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

import styles from './style.module.less';

export type DriveCreateType = 'agent' | 'drawio' | 'folder' | 'skill';

export interface DriveCreateProps {
  type: DriveCreateType;
  isOpen: boolean;
  parentId?: string;
  groupId?: string;
  parentLabel?: string;
  existingFolderNames?: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdId: string, type: DriveCreateType) => void | Promise<void>;
}

const DEFAULT_DRAWIO_TITLE = '未命名图表';

function DriveCreate({
  type,
  isOpen,
  parentId,
  groupId,
  parentLabel,
  existingFolderNames = [],
  onOpenChange,
  onSuccess,
}: DriveCreateProps) {
  const agentService = useAgentService();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const skillService = useSkillService();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');

  const reset = () => {
    setTitle('');
    setName('');
    setDescription('');
    setTitleError('');
  };

  const { loading, run: runCreate } = useRequest(
    async () => {
      let createdId: string;
      switch (type) {
        case 'agent':
          createdId = await agentService.createAgent(
            title.trim(),
            name.trim() || undefined,
            description.trim() || undefined
          );
          break;
        case 'drawio': {
          const result = await noteService.createNote({
            title: title.trim() || DEFAULT_DRAWIO_TITLE,
            resourceType: 'DRAWIO',
          });
          if (!result.resourceId) {
            throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
          }
          createdId = result.resourceId;
          break;
        }
        case 'folder':
          if (!parentId) {
            throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
              reason: '新建文件夹目标不存在',
            });
          }
          createdId = await driveService.createFolder({
            parentId,
            groupId,
            name: title.trim(),
          });
          break;
        case 'skill':
          createdId = await skillService.createSkill(
            title.trim(),
            name.trim() || undefined,
            description.trim() || undefined
          );
          break;
      }
      await onSuccess(createdId, type);
    },
    {
      manual: true,
      onSuccess: () => {
        if (type === 'folder') toast.success('新建成功');
        reset();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleSubmit = () => {
    switch (type) {
      case 'folder': {
        const trimmed = title.trim();
        if (!trimmed) {
          setTitleError('请输入文件夹名称');
          return;
        }
        const validation = validateReservedName(trimmed);
        if (!validation.valid) {
          setTitleError(validation.reason ?? '文件夹名称不合法');
          return;
        }
        if (existingFolderNames.includes(trimmed)) {
          setTitleError('当前目录下已存在同名文件夹');
          return;
        }
        runCreate();
        break;
      }
      case 'agent':
      case 'skill':
        if (title.trim()) runCreate();
        break;
      case 'drawio':
        runCreate();
        break;
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  switch (type) {
    case 'folder':
      return (
        <AppFormDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title="新建文件夹"
          confirmText="创建"
          onSubmit={handleSubmit}
          isSubmitting={loading}
          isDismissable={!loading}
        >
          <div className={styles.pathHint}>
            {parentLabel ? `创建到「${parentLabel}」下` : '当前目录'}
          </div>
          <FormField
            aria-label="文件夹名称"
            label="文件夹名称"
            name="folderName"
            value={title}
            onChange={(value) => {
              setTitle(value);
              setTitleError('');
            }}
            errorMessage={titleError}
            isRequired
          >
            <Input placeholder="请输入文件夹名称" autoFocus />
          </FormField>
        </AppFormDialog>
      );
    case 'drawio':
      return (
        <AppFormDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title="新建图表"
          confirmText="创建"
          onSubmit={handleSubmit}
          isSubmitting={loading}
          isDismissable={!loading}
        >
          <FormField
            aria-label="图表名称"
            label="图表名称"
            name="drawioName"
            value={title}
            onChange={setTitle}
          >
            <Input placeholder={DEFAULT_DRAWIO_TITLE} autoFocus />
          </FormField>
        </AppFormDialog>
      );
    case 'agent':
      return (
        <AppModal
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title="创建新 Agent"
          size="lg"
          isDismissable={!loading}
          actions={
            <>
              <Button
                variant="secondary"
                isDisabled={loading}
                onPress={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={!title.trim() || loading}
                aria-busy={loading || undefined}
                onPress={handleSubmit}
              >
                创建
              </Button>
            </>
          }
        >
          <div className={styles.form}>
            <TextField aria-label="文件名（显示用）" value={title} onChange={setTitle} isRequired>
              <Label>文件名（显示用）</Label>
              <Input autoFocus placeholder="例如：课程研究助手" />
            </TextField>
            <TextField aria-label="Agent 名称（模型用）" value={name} onChange={setName}>
              <Label>Agent 名称（模型用）</Label>
              <Input placeholder="course_research_assistant" />
            </TextField>
            <TextField aria-label="描述（模型用）" value={description} onChange={setDescription}>
              <Label>描述（模型用）</Label>
              <TextArea rows={3} placeholder="描述这个 Agent 适合处理的任务" />
            </TextField>
          </div>
        </AppModal>
      );
    case 'skill':
      return (
        <AppModal
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title="创建新 Skill"
          size="lg"
          isDismissable={!loading}
          actions={
            <>
              <Button
                variant="secondary"
                isDisabled={loading}
                onPress={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={!title.trim() || loading}
                aria-busy={loading || undefined}
                onPress={handleSubmit}
              >
                创建
              </Button>
            </>
          }
        >
          <div className={styles.form}>
            <TextField aria-label="文件名（显示用）" value={title} onChange={setTitle} isRequired>
              <Label>文件名（显示用）</Label>
              <Input autoFocus placeholder="例如：论文精读助手" />
            </TextField>
            <TextField aria-label="Skill 名称（模型用）" value={name} onChange={setName}>
              <Label>Skill 名称（模型用）</Label>
              <Input placeholder="paper_reading_assistant" />
            </TextField>
            <TextField aria-label="描述（模型用）" value={description} onChange={setDescription}>
              <Label>描述（模型用）</Label>
              <TextArea rows={3} placeholder="描述这个 Skill 适合处理的任务" />
            </TextField>
          </div>
        </AppModal>
      );
  }
}

export default DriveCreate;

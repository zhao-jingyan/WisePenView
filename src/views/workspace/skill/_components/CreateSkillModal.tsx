import { Input, TextArea } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { useSkillService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Label, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

import styles from '../style.module.less';

interface CreateSkillModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (resourceId: string) => void;
}

function CreateSkillModal({ isOpen, onOpenChange, onSuccess }: CreateSkillModalProps) {
  const skillService = useSkillService();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { loading, run: runCreate } = useRequest(
    async () => {
      return skillService.createSkill(
        title.trim(),
        name.trim() || undefined,
        description.trim() || undefined
      );
    },
    {
      manual: true,
      onSuccess,
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleClose = () => {
    setTitle('');
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="创建新 Skill"
      size="lg"
      isDismissable={!loading}
      actions={
        <>
          <Button variant="secondary" isDisabled={loading} onPress={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={!title.trim() || loading}
            aria-busy={loading || undefined}
            onPress={() => runCreate()}
          >
            创建
          </Button>
        </>
      }
    >
      <div className={styles.createForm}>
        <TextField
          aria-label="文件名（显示用）"
          value={title}
          onChange={setTitle}
          autoFocus
          isRequired
        >
          <Label>文件名（显示用）*</Label>
          <Input placeholder="例如：论文精读助手" />
        </TextField>
        <TextField aria-label="Skill 名称（模型用）" value={name} onChange={setName}>
          <Label>Skill 名称（模型用）</Label>
          <Input placeholder="paper_reading_assistant" />
        </TextField>
        <TextField aria-label="描述（模型用）" value={description} onChange={setDescription}>
          <Label>描述（模型用）</Label>
          <TextArea placeholder="描述这个 Skill 适合处理的任务" rows={3} />
        </TextField>
      </div>
    </AppModal>
  );
}

export default CreateSkillModal;

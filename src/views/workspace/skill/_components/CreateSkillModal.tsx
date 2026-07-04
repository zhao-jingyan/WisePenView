import { useSkillService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Input, Label, Modal, TextArea, TextField, toast } from '@heroui/react';
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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>创建新 Skill</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
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
                <TextField
                  aria-label="描述（模型用）"
                  value={description}
                  onChange={setDescription}
                >
                  <Label>描述（模型用）</Label>
                  <TextArea placeholder="描述这个 Skill 适合处理的任务" rows={3} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={handleClose} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={() => runCreate()}
                isDisabled={!title.trim() || loading}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default CreateSkillModal;

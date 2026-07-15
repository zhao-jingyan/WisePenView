import { FormField, Input, TextArea } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useInteractService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import styles from './style.module.less';

interface EditCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collection: FavoriteCollection | null;
  onSuccess: () => void;
}

function EditCollectionModal({ onOpenChange, collection, onSuccess }: EditCollectionModalProps) {
  const interactService = useInteractService();
  const isCreate = collection == null;
  const [name, setName] = useState(collection?.collectionName ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const { loading, run: submit } = useRequest(
    async () => {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      if (isCreate) {
        await interactService.createFavoriteCollection({
          collectionName: trimmedName,
          description: trimmedDescription || null,
        });
      } else {
        await interactService.updateFavoriteCollection({
          collectionId: collection.collectionId,
          collectionName: trimmedName,
          description: trimmedDescription || null,
        });
      }
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(isCreate ? '收藏夹创建成功' : '收藏夹修改成功');
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning('请输入收藏夹名称');
      return;
    }
    submit();
  };

  return (
    <AppFormDialog
      isOpen
      onOpenChange={onOpenChange}
      title={isCreate ? '新建收藏夹' : '编辑收藏夹'}
      confirmText={isCreate ? '创建' : '保存'}
      isSubmitting={loading}
      onSubmit={handleSubmit}
    >
      <div className={styles.body}>
        <FormField
          aria-label="收藏夹名称"
          label="收藏夹名称"
          value={name}
          onChange={setName}
          isRequired
        >
          <Input placeholder="收藏夹名称（必填）" autoFocus />
        </FormField>
        <FormField aria-label="描述" label="描述" value={description} onChange={setDescription}>
          <TextArea placeholder="描述（可选）" rows={4} />
        </FormField>
      </div>
    </AppFormDialog>
  );
}

export default EditCollectionModal;

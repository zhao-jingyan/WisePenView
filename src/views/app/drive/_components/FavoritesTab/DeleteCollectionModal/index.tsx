import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useInteractService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Checkbox, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

interface DeleteCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string | null;
  onSuccess: () => void;
}

function DeleteCollectionModal({
  onOpenChange,
  collectionId,
  collectionName,
  onSuccess,
}: DeleteCollectionModalProps) {
  const interactService = useInteractService();
  const [keepResources, setKeepResources] = useState(false);
  const { loading, run: remove } = useRequest(
    () =>
      interactService.deleteFavoriteCollection({
        collectionId,
        keepResourcesToDefault: keepResources,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('收藏夹已删除');
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  return (
    <AppAlertDialog
      isOpen
      onOpenChange={onOpenChange}
      type="danger"
      title="删除收藏夹"
      description={`确定要删除收藏夹「${collectionName ?? '我的收藏'}」吗？此操作不可撤销。`}
      confirmText="删除"
      isConfirmLoading={loading}
      onConfirm={remove}
    >
      <Checkbox isSelected={keepResources} onChange={setKeepResources} variant="secondary">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span data-slot="label">将该收藏夹内的资源保留到我的收藏</span>
        </Checkbox.Content>
      </Checkbox>
    </AppAlertDialog>
  );
}

export default DeleteCollectionModal;

import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useInteractService } from '@/domains';
import type { FavoriteItem } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';

interface UnfavoriteResourceModalProps {
  item: FavoriteItem | undefined;
  collectionId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function UnfavoriteResourceModal({
  item,
  collectionId,
  onOpenChange,
  onSuccess,
}: UnfavoriteResourceModalProps) {
  const interactService = useInteractService();
  const { loading, run: unfavorite } = useRequest(
    async () => {
      if (!item) return;
      const collectionIds = await interactService.getFavoriteCollectionIds(item.resourceId);
      return interactService.updateFavoriteCollections({
        resourceId: item.resourceId,
        collectionIds: collectionIds.filter((id) => id !== collectionId),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('已移出收藏夹');
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  return (
    <AppAlertDialog
      isOpen={Boolean(item)}
      onOpenChange={onOpenChange}
      type="danger"
      title="移出收藏夹"
      description={`确定要将「${item?.resourceInfo?.resourceName ?? '该资源'}」移出当前收藏夹吗？`}
      confirmText="移出"
      isConfirmLoading={loading}
      onConfirm={unfavorite}
    />
  );
}

export default UnfavoriteResourceModal;

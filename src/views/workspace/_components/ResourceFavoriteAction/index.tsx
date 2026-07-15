import { useInteractService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import CollectionPickerModal from './CollectionPickerModal';
import ResourceFavoriteButton from './ResourceFavoriteButton';
import { useCollectionPickerController } from './hooks/useCollectionPickerController';

interface ResourceFavoriteActionProps {
  resourceId: string;
  onSuccess?: () => unknown | Promise<unknown>;
}

interface CollectionPickerControllerProps {
  resourceId: string;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (collectionIds: string[]) => void;
}

function CollectionPickerController(props: CollectionPickerControllerProps) {
  const controller = useCollectionPickerController(props);
  return <CollectionPickerModal {...controller} />;
}

function ResourceFavoriteAction({ resourceId, onSuccess }: ResourceFavoriteActionProps) {
  const interactService = useInteractService();
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    data: collectionIds,
    loading: loadingStatus,
    mutate: mutateCollectionIds,
  } = useRequest(() => interactService.getFavoriteCollectionIds(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });

  const notifySuccess = () => {
    void Promise.resolve(onSuccess?.()).catch((error) => toast.danger(parseErrorMessage(error)));
  };

  const { loading: loadingUnfavorite, run: unfavorite } = useRequest(
    async () => {
      await interactService.updateFavoriteCollections({ resourceId, collectionIds: [] });
      return interactService.getFavoriteCollectionIds(resourceId);
    },
    {
      manual: true,
      onSuccess: (nextCollectionIds) => {
        mutateCollectionIds(nextCollectionIds);
        notifySuccess();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handlePress = () => {
    if (collectionIds?.length === 1) {
      unfavorite();
      return;
    }
    setPickerOpen(true);
  };

  return (
    <>
      <ResourceFavoriteButton
        isFavorited={Boolean(collectionIds?.length)}
        isDisabled={loadingStatus || loadingUnfavorite || !collectionIds}
        onPress={handlePress}
      />
      {pickerOpen ? (
        <CollectionPickerController
          key={resourceId}
          resourceId={resourceId}
          onOpenChange={setPickerOpen}
          onConfirmed={(nextCollectionIds) => {
            mutateCollectionIds(nextCollectionIds);
            notifySuccess();
          }}
        />
      ) : null}
    </>
  );
}

export default ResourceFavoriteAction;

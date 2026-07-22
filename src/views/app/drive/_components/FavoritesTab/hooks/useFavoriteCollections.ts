import { useInteractService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';

export function useFavoriteCollections() {
  const interactService = useInteractService();
  const { data, loading, refresh } = useRequest(() => interactService.listFavoriteCollections(), {
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });

  return {
    collections: data ?? [],
    hasLoaded: data !== undefined,
    loading,
    refresh,
  };
}

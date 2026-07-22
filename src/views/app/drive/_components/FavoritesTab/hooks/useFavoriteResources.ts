import { useInteractService } from '@/domains';
import type { FavoriteItem } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState } from 'react';

const PAGE_SIZE = 20;

export function useFavoriteResources(collectionId: string) {
  const interactService = useInteractService();
  const [loadedItems, setLoadedItems] = useState<FavoriteItem[]>([]);
  const [lastLoadedPage, setLastLoadedPage] = useState(1);
  const loadGenerationRef = useRef(0);
  const {
    data: firstPage,
    loading,
    refresh: refreshFirstPage,
  } = useRequest(
    () => interactService.listFavoritedResources({ collectionId, page: 1, size: PAGE_SIZE }),
    {
      refreshDeps: [collectionId],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: loadingMore, run: loadMore } = useRequest(
    async () => {
      const loadGeneration = loadGenerationRef.current;
      const nextPage = lastLoadedPage + 1;
      const nextResult = await interactService.listFavoritedResources({
        collectionId,
        page: nextPage,
        size: PAGE_SIZE,
      });
      if (loadGeneration !== loadGenerationRef.current) return;
      setLoadedItems((items) => [...items, ...nextResult.list]);
      setLastLoadedPage(nextPage);
    },
    {
      manual: true,
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const refresh = () => {
    loadGenerationRef.current += 1;
    setLoadedItems([]);
    setLastLoadedPage(1);
    refreshFirstPage();
  };

  const totalPage = firstPage?.totalPage ?? 0;
  return {
    list: [...(firstPage?.list ?? []), ...loadedItems],
    total: firstPage?.total ?? 0,
    loading,
    loadingMore,
    hasMore: lastLoadedPage < totalPage,
    loadMore,
    refresh,
  };
}

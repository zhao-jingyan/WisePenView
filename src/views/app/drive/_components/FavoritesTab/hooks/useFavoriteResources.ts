import { useInteractService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

const PAGE_SIZE = 20;

export function useFavoriteResources(collectionId?: string) {
  const interactService = useInteractService();
  const [page, setPage] = useState(1);
  const { data, loading } = useRequest(
    () => interactService.listFavoritedResources({ collectionId, page, size: PAGE_SIZE }),
    {
      refreshDeps: [collectionId, page],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const totalPage = data?.totalPage ?? 0;
  return {
    list: data?.list ?? [],
    total: data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPage,
    loading,
    setPage,
  };
}

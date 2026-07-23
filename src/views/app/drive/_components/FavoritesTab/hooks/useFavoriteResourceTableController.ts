import type { FavoriteItem } from '@/domains/Interact';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useState } from 'react';
import { useFavoriteResources } from './useFavoriteResources';

interface UseFavoriteResourceTableControllerOptions {
  collectionId: string;
  onCollectionChanged: () => void;
}

export function useFavoriteResourceTableController({
  collectionId,
  onCollectionChanged,
}: UseFavoriteResourceTableControllerOptions) {
  const openInWorkspace = useOpenInWorkspace();
  const { list, total, loading, loadingMore, hasMore, loadMore, refresh } =
    useFavoriteResources(collectionId);
  const [unfavoriteItem, setUnfavoriteItem] = useState<FavoriteItem>();
  const [manageFavoriteItem, setManageFavoriteItem] = useState<FavoriteItem>();
  const openResource = (item: FavoriteItem) => {
    if (!item.resourceInfo) return;
    openInWorkspace({
      resourceId: item.resourceId,
      resourceType: item.resourceInfo.resourceType,
      resourceName: item.resourceInfo.resourceName,
    });
  };

  const handleRowAction = (item: FavoriteItem, key: string) => {
    if (key === 'open') {
      openResource(item);
      return;
    }
    if (key === 'manage') {
      if (item.resourceInfo) setManageFavoriteItem(item);
      return;
    }
    if (key === 'remove') {
      setUnfavoriteItem(item);
    }
  };

  const refreshCollections = () => {
    void refresh();
    onCollectionChanged();
  };

  return {
    list,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    unfavoriteItem,
    manageFavoriteItem,
    onOpenResource: openResource,
    onRowAction: handleRowAction,
    onCloseUnfavorite: () => setUnfavoriteItem(undefined),
    onUnfavoriteSuccess: () => {
      refreshCollections();
    },
    onCloseManageFavorite: () => setManageFavoriteItem(undefined),
    onManageFavoriteSuccess: () => {
      setManageFavoriteItem(undefined);
      refreshCollections();
    },
  };
}

import type { DriveTableRow } from '@/components/Drive/TableDrive/index.type';
import { buildDriveNodeScope, type DriveNode } from '@/domains/Drive';
import type { FavoriteItem } from '@/domains/Interact';
import type { ResourceItem } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { useState } from 'react';
import { useFavoriteResources } from './useFavoriteResources';

interface UseFavoriteResourceTableControllerOptions {
  collectionId: string;
  onCollectionChanged: () => void;
}

function toFavoriteTableRow(resource: ResourceItem): DriveTableRow {
  const node: DriveNode = {
    type: 'resource',
    id: `favorite:${resource.resourceId}`,
    parentId: 'favorite-root',
    scope: buildDriveNodeScope(),
    resourceId: resource.resourceId,
    title: resource.resourceName,
    resourceType: resource.resourceType,
    resourceIconType: resource.resourceIconType ?? 'file',
    size: resource.size,
    folderTagId: '',
  };

  return {
    id: node.id,
    name: resource.resourceName,
    entryType: 'resource',
    resourceType: resource.resourceType,
    resourceIconType: resource.resourceIconType,
    sizeLabel: formatFileSize(resource.size),
    typeLabel: resource.resourceType ?? '资源',
    node,
  };
}

export function useFavoriteResourceTableController({
  collectionId,
  onCollectionChanged,
}: UseFavoriteResourceTableControllerOptions) {
  const openInWorkspace = useOpenInWorkspace();
  const { list, total, page, pageSize, totalPage, loading, setPage, refresh } =
    useFavoriteResources(collectionId);
  const [unfavoriteItem, setUnfavoriteItem] = useState<FavoriteItem>();
  const [manageFavoriteItem, setManageFavoriteItem] = useState<FavoriteItem>();
  const [selectedResourceId, setSelectedResourceId] = useState<string>();
  const selectedItem = list.find((item) => item.resourceId === selectedResourceId);
  const selectedRow = selectedItem?.resourceInfo
    ? toFavoriteTableRow(selectedItem.resourceInfo)
    : undefined;

  const openResource = (item: FavoriteItem) => {
    if (!item.resourceInfo) return;
    openInWorkspace({
      resourceId: item.resourceId,
      resourceType: item.resourceInfo.resourceType,
      resourceName: item.resourceInfo.resourceName,
      driveLocation: { scope: buildDriveNodeScope() },
    });
  };

  const openSelectedResource = (node: DriveNode) => {
    if (node.type !== 'resource' && node.type !== 'link') return;
    openInWorkspace({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
      driveLocation: { scope: buildDriveNodeScope() },
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
    page,
    pageSize,
    totalPage,
    loading,
    setPage,
    selectedResourceId,
    selectedItem,
    selectedRow,
    unfavoriteItem,
    manageFavoriteItem,
    onRowSelect: (item: FavoriteItem) => setSelectedResourceId(item.resourceId),
    onRowActivate: openResource,
    onDetailOpen: openSelectedResource,
    onRowAction: handleRowAction,
    onRequestUnfavorite: setUnfavoriteItem,
    onCloseUnfavorite: () => setUnfavoriteItem(undefined),
    onUnfavoriteSuccess: () => {
      setSelectedResourceId(undefined);
      refreshCollections();
    },
    onCloseManageFavorite: () => setManageFavoriteItem(undefined),
    onManageFavoriteSuccess: () => {
      setManageFavoriteItem(undefined);
      refreshCollections();
    },
  };
}

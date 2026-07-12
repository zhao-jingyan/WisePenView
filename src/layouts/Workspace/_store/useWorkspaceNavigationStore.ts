import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkspaceResourceLocation {
  resourceId: string;
  parentNodeId: string;
  nodeId?: string;
}

export interface WorkspaceNavigationLocation {
  scope: DriveNodeScope;
  resource?: WorkspaceResourceLocation;
}

interface WorkspaceNavigationState {
  location: WorkspaceNavigationLocation;
  navigateToScope: (scope: DriveNodeScope) => void;
  navigateToResource: (
    location: WorkspaceNavigationLocation & { resource: WorkspaceResourceLocation }
  ) => void;
}

const DEFAULT_LOCATION: WorkspaceNavigationLocation = {
  scope: buildDriveNodeScope(),
};

export const useWorkspaceNavigationStore = create<WorkspaceNavigationState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      navigateToScope: (scope) => set({ location: { scope } }),
      navigateToResource: (location) => set({ location }),
    }),
    { name: 'workspace-navigation', storage: createStoreJSONStorage('tab') }
  )
);

const resetWorkspaceNavigationStore = (): void => {
  useWorkspaceNavigationStore.setState({ location: DEFAULT_LOCATION });
};

registerStore({
  id: 'workspace.navigation',
  scope: 'tab',
  reset: resetWorkspaceNavigationStore,
});

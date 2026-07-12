import type { WorkspaceResourceType, WorkspaceViewer } from '@/utils/navigation/workspaceRoute';
import { useLayoutEffect, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ResourceHeaderConfig } from './_common/ResourceHeader/index.type';
import type { WorkspaceChatStateProvider } from './WorkspaceChatProtocol';

export interface WorkspaceHeaderConfig {
  resource?: ResourceHeaderConfig;
  inlineTitle?: ReactNode;
  extra?: ReactNode;
  titleBlock?: ReactNode;
  className?: string;
}

export interface WorkspaceLayoutConfig {
  className?: string;
  bodyClassName?: string;
  header?: WorkspaceHeaderConfig | false;
  chatStateProvider?: WorkspaceChatStateProvider;
}

export interface WorkspaceRouteContext {
  resourceId?: string;
  resourceType?: WorkspaceResourceType;
  viewer?: WorkspaceViewer;
}

export interface WorkspaceOutletContextValue {
  routeContext: WorkspaceRouteContext;
  setLayoutConfig: (config: WorkspaceLayoutConfig) => void;
  resetLayoutConfig: () => void;
}

function useWorkspaceOutletContext() {
  const context = useOutletContext<WorkspaceOutletContextValue | null>();
  if (!context) {
    throw new Error('useWorkspaceOutletContext 必须在 WorkspaceLayout 的 Outlet 内使用');
  }
  return context;
}

export function useWorkspaceRouteContext() {
  return useWorkspaceOutletContext().routeContext;
}

export function useWorkspaceLayoutConfig(config: WorkspaceLayoutConfig) {
  const { setLayoutConfig, resetLayoutConfig } = useWorkspaceOutletContext();

  useLayoutEffect(() => {
    setLayoutConfig(config);
  }, [config, setLayoutConfig]);

  useLayoutEffect(() => {
    return resetLayoutConfig;
  }, [resetLayoutConfig]);
}

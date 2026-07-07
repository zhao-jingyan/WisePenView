import type { ChatWorkspaceContext } from '@/domains/Chat';
import type { WorkspaceResourceType, WorkspaceViewer } from '@/utils/navigation/workspaceRoute';
import { useLayoutEffect, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';

export interface WorkspaceHeaderConfig {
  fallbackTo?: string;
  backLabel?: string;
  inlineTitle?: ReactNode;
  extra?: ReactNode;
  titleBlock?: ReactNode;
  className?: string;
}

export interface WorkspaceLayoutConfig {
  className?: string;
  bodyClassName?: string;
  header?: WorkspaceHeaderConfig | false;
  chatContext?: ChatWorkspaceContext;
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

export function useOptionalWorkspaceRouteContext() {
  return useOutletContext<WorkspaceOutletContextValue | null>()?.routeContext;
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

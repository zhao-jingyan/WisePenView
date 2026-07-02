import { resolveResourceIconType } from '@/domains/Resource';
import {
  Bot,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  HardDrive,
  Link,
  LoaderCircle,
  NotebookPen,
  Presentation,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { EntryIconProps } from './index.type';

const COLOR_SECONDARY = 'var(--muted)';
const COLOR_FOLDER = 'var(--warning)';
const COLOR_DOC = 'var(--primary)';
const COLOR_PDF = 'var(--danger)';
const COLOR_PPT = 'var(--warning)';
const COLOR_XLS = 'var(--success)';
const COLOR_NOTE = 'var(--accent)';
const COLOR_DRAWIO = 'var(--primary)';
const COLOR_AI = 'var(--primary-light)';

function renderResourceIcon(
  resourceType?: string,
  resourceIconType?: EntryIconProps['resourceIconType'],
  size = 18,
  color?: string
) {
  const iconType =
    resourceIconType ??
    resolveResourceIconType({
      resourceType,
    });

  switch (iconType) {
    case 'note':
      return <NotebookPen size={size} color={color ?? COLOR_NOTE} />;
    case 'drawio':
      return <Workflow size={size} color={color ?? COLOR_DRAWIO} />;
    case 'skill':
      return <Wrench size={size} color={color ?? COLOR_AI} />;
    case 'agent':
      return <Bot size={size} color={color ?? COLOR_AI} />;
    case 'pdf':
      return <FileText size={size} color={color ?? COLOR_PDF} />;
    case 'doc':
      return <FileType size={size} color={color ?? COLOR_DOC} />;
    case 'ppt':
      return <Presentation size={size} color={color ?? COLOR_PPT} />;
    case 'xls':
      return <FileSpreadsheet size={size} color={color ?? COLOR_XLS} />;
    case 'md':
      return <FileCode size={size} color={color ?? COLOR_SECONDARY} />;
    case 'file':
      return <File size={size} color={color ?? COLOR_SECONDARY} />;
  }
}

/** 统一展示根目录、文件夹、资源、链接和加载占位图标 */
function EntryIcon({
  entryType,
  resourceType,
  resourceIconType,
  size = 18,
  color,
}: EntryIconProps) {
  switch (entryType) {
    case 'root':
      return <HardDrive size={size} color={color ?? COLOR_SECONDARY} />;
    case 'folder':
      return <Folder size={size} color={color ?? COLOR_FOLDER} />;
    case 'resource':
      return renderResourceIcon(resourceType, resourceIconType, size, color);
    case 'link':
      return <Link size={size} color={color ?? COLOR_SECONDARY} />;
    case 'loading':
      return <LoaderCircle size={size} color={color ?? COLOR_SECONDARY} />;
  }
}

export default EntryIcon;

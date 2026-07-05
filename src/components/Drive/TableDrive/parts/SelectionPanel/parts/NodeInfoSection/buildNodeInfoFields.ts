import type { DocDisplayInfoResponse } from '@/domains/Document';
import type { NoteInfoDisplayData } from '@/domains/Note';
import type { ResourceItem } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import type { DriveTableRow } from '../../../../index.type';
import type { NodeInfoField } from './index.type';

const NO_VALUE = '—';

type ResourceItemWithUpdateTime = ResourceItem & {
  updateTime?: string | null;
};

function formatUserDisplayName(user?: UserDisplayBase): string {
  const nickname = user?.nickname?.trim();
  if (nickname) {
    return nickname;
  }
  const realName = user?.realName?.trim();
  if (realName) {
    return realName;
  }
  return NO_VALUE;
}

function formatModifiedDate(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '暂无') {
    return NO_VALUE;
  }
  const formatted = formatTimestampToDateTime(trimmed);
  return formatted || trimmed;
}

function readResourceUpdateTime(resource?: ResourceItemWithUpdateTime): string | undefined {
  const updateTime = resource?.updateTime?.trim();
  return updateTime || undefined;
}

function buildStandardFields(params: {
  size?: number | null;
  modifiedText?: string | null;
  owner?: UserDisplayBase;
}): NodeInfoField[] {
  const sizeValue = params.size;
  const hasSize = sizeValue != null && sizeValue >= 0;
  const modifiedValue = formatModifiedDate(params.modifiedText);
  const ownerValue = formatUserDisplayName(params.owner);

  return [
    {
      id: 'size',
      label: '大小',
      value: hasSize ? formatFileSize(sizeValue) : NO_VALUE,
      muted: !hasSize,
    },
    {
      id: 'modified',
      label: '修改日期',
      value: modifiedValue,
      muted: modifiedValue === NO_VALUE,
    },
    {
      id: 'owner',
      label: '所有者',
      value: ownerValue,
      muted: ownerValue === NO_VALUE,
    },
  ];
}

function buildFolderFields(): NodeInfoField[] {
  return buildStandardFields({});
}

function buildResourceFieldsFromDocInfo(docInfo: DocDisplayInfoResponse): NodeInfoField[] {
  const { resourceInfo, docMetaInfo } = docInfo;
  return buildStandardFields({
    size: resourceInfo.size ?? docMetaInfo.uploadMeta.size,
    modifiedText: readResourceUpdateTime(resourceInfo),
    owner: resourceInfo.ownerInfo,
  });
}

function buildResourceFieldsFromNoteInfo(noteInfo: NoteInfoDisplayData): NodeInfoField[] {
  const resourceInfo = noteInfo.resourceInfo;
  return buildStandardFields({
    size: resourceInfo?.size,
    modifiedText: noteInfo.lastEditedAtText || readResourceUpdateTime(resourceInfo),
    owner: resourceInfo?.ownerInfo,
  });
}

function buildStaticResourceFields(): NodeInfoField[] {
  return buildStandardFields({});
}

export function buildNodeInfoFields(params: {
  selectedRow: DriveTableRow;
  docInfo?: DocDisplayInfoResponse;
  noteInfo?: NoteInfoDisplayData;
}): NodeInfoField[] {
  const { selectedRow, docInfo, noteInfo } = params;
  const node = selectedRow.node;

  if (node.type === 'folder') {
    return buildFolderFields();
  }

  if (node.type !== 'resource' && node.type !== 'link') {
    return [];
  }

  if (noteInfo) {
    return buildResourceFieldsFromNoteInfo(noteInfo);
  }

  if (docInfo) {
    return buildResourceFieldsFromDocInfo(docInfo);
  }

  return buildStaticResourceFields();
}

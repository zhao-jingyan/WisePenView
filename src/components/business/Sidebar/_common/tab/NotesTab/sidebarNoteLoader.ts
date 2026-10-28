import {
  buildDriveNodeScope,
  type DriveResourceLocation,
  type DriveResourceNode,
} from '@/domains/Drive';
import type { IDriveService } from '@/domains/Drive/service/index.type';
import type { INoteService } from '@/domains/Note/service/index.type';

import type { SidebarNoteItem } from './index.type';

const SIDEBAR_NOTE_PAGE_SIZE = 100;

export interface SidebarNotesData {
  notes: SidebarNoteItem[];
  location: DriveResourceLocation;
}

/**
 * 读取个人 `.Note` 系统目录的全部笔记。
 *
 * `.Note` 本身已经表达资源归属，不再按 resourceType 做二次筛选；
 * 后端列表项的该字段可能缺失或大小写不一致，二次筛选会让已有笔记消失。
 */
export async function loadSidebarNotes(
  driveService: IDriveService,
  noteService: INoteService
): Promise<SidebarNotesData> {
  const folder = await driveService.getSystemFolder({
    scope: buildDriveNodeScope(),
    type: 'note',
  });
  const resourceNodes: DriveResourceNode[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await driveService.loadNodeChildren({
      parent: folder,
      cursor,
      pageSize: SIDEBAR_NOTE_PAGE_SIZE,
      kinds: ['resource'],
      refresh: !cursor,
    });
    resourceNodes.push(...page.resourceNodes);
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  }

  const notes = await Promise.all(
    resourceNodes.map(async (node): Promise<SidebarNoteItem> => {
      try {
        const info = await noteService.getNoteInfoDisplay({ resourceId: node.resourceId });
        return {
          resourceId: node.resourceId,
          title: info.noteTitle || node.title,
          lastEditedAtText: info.lastEditedAtText,
        };
      } catch {
        // 单条笔记元数据异常不阻断整个侧栏，仍允许用户打开原始资源。
        return {
          resourceId: node.resourceId,
          title: node.title,
          lastEditedAtText: '',
        };
      }
    })
  );

  return {
    notes,
    location: {
      scope: folder.scope,
      mountTagId: folder.tagId,
    },
  };
}

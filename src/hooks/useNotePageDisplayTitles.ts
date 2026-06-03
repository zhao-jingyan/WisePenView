import { useMemo } from 'react';

import { useResourceDisplayNameStore } from '@/store';

export interface NotePageDisplayTitles {
  /** 目录侧栏第一条文档标题 */
  outlineTitle: string;
  /** 传入 ResourceViewerHeader.inlineTitle 的文案 */
  toolbarTitle: string;
}

/**
 * 笔记页展示用标题：优先已同步到全局 store 的名称，否则回退接口 noteTitle。
 */
export function useNotePageDisplayTitles(
  resourceId: string,
  apiNoteTitle: string | undefined
): NotePageDisplayTitles {
  const stored = useResourceDisplayNameStore((s) =>
    resourceId !== '' ? s.byResourceId[resourceId] : undefined
  );

  return useMemo(() => {
    const fromStore = stored?.trim();
    const fromApi = apiNoteTitle?.trim();
    const picked = (fromStore ?? fromApi ?? '').trim();
    const effective = picked === '' ? '未命名笔记' : picked;
    const toolbarTitle = effective !== '未命名笔记' ? effective : '未命名笔记';
    return { outlineTitle: effective, toolbarTitle };
  }, [stored, apiNoteTitle]);
}

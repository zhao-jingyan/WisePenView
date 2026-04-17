import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

export interface BreadcrumbItem {
  tagId: string;
  tagName: string;
}

export interface TreeDriveCwdState {
  /** 从根目录到当前目录的路径段（不含根目录本身；空数组 = 根目录） */
  breadcrumb: BreadcrumbItem[];
  /** 进入下一级节点 */
  pushNode: (item: BreadcrumbItem) => void;
  /** 跳转到面包屑中的某一级（-1 = 根目录） */
  navigateToIndex: (index: number) => void;
  /** 重置到根目录 */
  reset: () => void;
}

const storeMap = new Map<string, ReturnType<typeof createCwdStore>>();
const TREE_DRIVE_CWD_STORAGE_PREFIX = 'tree-drive-cwd-';

// 创建面包屑 store 实例
function createCwdStore(key: string) {
  return create<TreeDriveCwdState>()(
    persist(
      (set) => ({
        breadcrumb: [],
        /** 进入下一级节点 */
        pushNode: (item) => set((s) => ({ breadcrumb: [...s.breadcrumb, item] })),
        /** 跳转到面包屑中的某一级（-1 = 根目录） */
        navigateToIndex: (index) =>
          set((s) => ({
            breadcrumb: index < 0 ? [] : s.breadcrumb.slice(0, index + 1),
          })),
        /** 重置到根目录 */
        reset: () => set({ breadcrumb: [] }),
      }),
      { name: `tree-drive-cwd-${key}`, storage: zustandSessionStorage }
    )
  );
}

/** 按 key 获取独立的面包屑 store 实例（同一 key 返回同一 store） */
export function getTreeDriveCwdStore(key: string) {
  let store = storeMap.get(key);
  if (!store) {
    store = createCwdStore(key);
    storeMap.set(key, store);
  }
  return store;
}

export function clearTreeDriveCwdStores(): void {
  storeMap.forEach((store) => {
    store.setState({ breadcrumb: [] });
    store.persist.clearStorage();
  });
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (key.includes(TREE_DRIVE_CWD_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch {
    /* ignore */
  }
}

export { getTreeDriveCwdStore as useTreeDriveCwdStore };

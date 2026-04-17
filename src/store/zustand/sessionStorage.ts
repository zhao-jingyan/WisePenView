import { createJSONStorage } from 'zustand/middleware';

/** Zustand `persist` 统一使用 sessionStorage（关闭标签即失效） */
export const zustandSessionStorage = createJSONStorage(() => sessionStorage);

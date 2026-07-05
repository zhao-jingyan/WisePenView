import type { Selection } from '@heroui/react';

export function resolveSelectedCount(keys: Selection | undefined, total: number): number {
  if (!keys) {
    return 0;
  }
  if (keys === 'all') {
    return total;
  }
  return keys.size;
}

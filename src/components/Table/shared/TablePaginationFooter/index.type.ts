import type { ReactNode } from 'react';

export interface TablePaginationFooterProps {
  /** 左侧统计 */
  summary?: ReactNode;
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  /** 右侧控件*/
  pageSizeControl?: ReactNode;
  /** 当前页两侧各展示几页，默认 1 */
  siblingCount?: number;
  /** 首尾各保留几页，默认 1 */
  boundaryCount?: number;
  className?: string;
}

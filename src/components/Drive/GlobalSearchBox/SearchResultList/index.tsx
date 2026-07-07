import { Empty, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useResourceService } from '@/domains';
import type { SearchHitItem, SearchResultPage } from '@/domains/Resource';
import { SEARCH_SCOPE } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useActiveDriveScopeStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useInfiniteScroll, useKeyPress, useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useMemo, useRef, useState } from 'react';
import type { SearchResultListProps } from './index.type';
import styles from './style.module.less';

/** 单页大小：与后端 `@Max(100)` 上限一致，20 是首屏滚动加载的舒适步长 */
const PAGE_SIZE = 20;

const createEmptySearchResult = (): SearchResultPage => ({
  list: [],
  total: 0,
  page: 1,
  size: PAGE_SIZE,
  totalPage: 0,
});

interface SearchHitRowProps {
  item: SearchHitItem;
  active: boolean;
  flatIndex: number;
  onActivate: (flatIndex: number) => void;
  onOpen: (item: SearchHitItem) => void;
}

function SearchHitRow({ item, active, flatIndex, onActivate, onOpen }: SearchHitRowProps) {
  return (
    <li
      data-flat-index={flatIndex}
      className={clsx(styles.row, active && styles.rowActive)}
      onMouseEnter={() => onActivate(flatIndex)}
      onClick={() => onOpen(item)}
    >
      <div className={styles.rowIcon}>
        <EntryIcon
          entryType="resource"
          resourceType={item.resourceType}
          resourceIconType={item.resourceIconType}
          size={18}
        />
      </div>
      <div className={styles.rowText}>
        <div className={styles.rowTitle} dangerouslySetInnerHTML={{ __html: item.resourceName }} />
        {item.highlightContent && (
          <div
            className={styles.rowSnippet}
            dangerouslySetInnerHTML={{ __html: item.highlightContent }}
          />
        )}
      </div>
    </li>
  );
}

/** 单列表渲染 + 无限滚动 + 键盘导航；activeIndex 渲染期 clamp 规避 effect 内 setState */
function SearchResultList({ keyword, onClose }: SearchResultListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  // 继承当前 Drive 的 groupId，避免搜索跳转后把侧边栏上下文切回个人空间
  const groupId = useActiveDriveScopeStore((state) => state.groupId);
  const openInWorkspace = useOpenInWorkspace(groupId);
  const resourceService = useResourceService();
  const trimmed = keyword.trim();

  // ahooks useInfiniteScroll 承载分页/滚动监听/竞态拦截；keyword 变化触发 reloadDeps 回 page 1
  const { data, loading, loadingMore, noMore, mutate } = useInfiniteScroll<SearchResultPage>(
    async (current) => {
      if (trimmed.length === 0) {
        return createEmptySearchResult();
      }

      const nextPage = current ? Math.floor(current.list.length / PAGE_SIZE) + 1 : 1;
      return resourceService.globalSearch({
        keyword: trimmed,
        scope: SEARCH_SCOPE.ALL,
        page: nextPage,
        size: PAGE_SIZE,
      });
    },
    {
      target: listRef,
      isNoMore: (d) => !!d && d.page >= d.totalPage,
      reloadDeps: [trimmed],
      manual: trimmed.length === 0,
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const flatItems = useMemo(() => data?.list ?? [], [data?.list]);

  const [activeIndex, setActiveIndex] = useState(0);
  const clampedActive = flatItems.length === 0 ? 0 : Math.min(activeIndex, flatItems.length - 1);

  useUpdateEffect(() => {
    setActiveIndex(0);
    listRef.current?.scrollTo({ top: 0 });
    mutate(trimmed.length === 0 ? createEmptySearchResult() : undefined);
  }, [trimmed, mutate]);

  // 高亮项滚入视口；block:nearest 避免列表反复跳到顶/底
  useUpdateEffect(() => {
    if (flatItems.length === 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-flat-index="${clampedActive}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [clampedActive, flatItems.length]);

  const handleOpenHit = (item: SearchHitItem) => {
    onClose();
    openInWorkspace({
      resourceId: item.resourceId,
      resourceType: item.resourceType,
      resourceName: item.resourceName,
    });
  };

  useKeyPress(
    'uparrow',
    (e) => {
      if (flatItems.length === 0) return;
      e.preventDefault();
      setActiveIndex(Math.max(0, clampedActive - 1));
    },
    { exactMatch: true }
  );
  useKeyPress(
    'downarrow',
    (e) => {
      if (flatItems.length === 0) return;
      e.preventDefault();
      setActiveIndex(Math.min(flatItems.length - 1, clampedActive + 1));
    },
    { exactMatch: true }
  );
  useKeyPress(
    'enter',
    () => {
      const item = flatItems[clampedActive];
      if (item) handleOpenHit(item);
    },
    { exactMatch: true }
  );

  const hasKeyword = trimmed.length > 0;
  const hasHits = hasKeyword && flatItems.length > 0;
  const initialLoading = hasKeyword && loading && flatItems.length === 0;

  return (
    <div ref={listRef} className={styles.list}>
      {initialLoading ? (
        <div className={styles.initialLoading}>
          <Spin size="small" />
        </div>
      ) : hasHits ? (
        <>
          <ul className={styles.items}>
            {flatItems.map((item, flatIndex) => (
              <SearchHitRow
                key={item.resourceId}
                item={item}
                active={flatIndex === clampedActive}
                flatIndex={flatIndex}
                onActivate={setActiveIndex}
                onOpen={handleOpenHit}
              />
            ))}
          </ul>

          {loadingMore && (
            <div className={styles.loadingMore}>
              <Spin size="small" />
            </div>
          )}
          {!loadingMore && noMore && <div className={styles.footerHint}>已展示全部结果</div>}
        </>
      ) : (
        <div className={styles.emptyWrapper}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasKeyword ? '没有找到匹配结果' : '搜索文档、笔记和标签'}
          />
        </div>
      )}
    </div>
  );
}

export default SearchResultList;

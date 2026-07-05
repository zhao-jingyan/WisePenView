import TableBatchFooter from '../ManageTable/parts/BatchFooter';
import TableSelectionCheckbox from '../ManageTable/parts/SelectionCheckbox';
import TableCellAlign from '../shared/cells/CellAlign';
import TableTextCell from '../shared/cells/TextCell';
import { tableCellStyles, tableStyles } from '../shared/styles';
import {
  joinClassNames,
  resolveColumnAlign,
  shouldStretchTableCellContent,
} from '../shared/TableBase/cellAlign';
import {
  countFolderEqColumns,
  isFolderEqLayout,
  resolveFolderColumnWidthClassForColumn,
} from '../shared/TableBase/columnWidth';
import { resolveSelectedCount } from '../shared/TableBase/tableSelection';
import { sortFolderTreeRows } from '../shared/TableBase/tableSort';
import TableBodyState from '../shared/TableBodyState';
import TableRowActions from '../shared/TableRowActions';
import type { TableRowActionItem } from '../shared/TableRowActions/index.type';
import { renderSortableColumnLabel } from '../shared/TableSortHeader/renderSortableColumnLabel';
import { TableLoadMoreRow } from '../shared/TableStatusRows';
import TableSummaryFooter from '../shared/TableSummaryFooter';
import { createDefaultFolderColumns } from './defaultColumns';
import type {
  FolderTableColumn,
  FolderTableProps,
  FolderTableRow,
  FolderTableRowAction,
  FolderTableRowContext,
  FolderTableVisibleRow,
} from './index.type';
import FolderTableNameCell from './parts/FolderNameCell';
import FolderTableLoadingSkeleton from './parts/LoadingSkeleton';
import styles from './style.module.less';

import type { Selection } from '@heroui/react';
import { Table } from '@heroui/react';
import { Folder } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type UIEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

const LOAD_MORE_THRESHOLD_PX = 48;
const ROW_ID_ATTRIBUTE = 'data-folder-row-id';
const IMMEDIATE_SELECTED_ATTRIBUTE = 'data-folder-row-immediate-selected';
const INTERACTIVE_ROW_TARGET_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[data-row-click-ignore="true"]',
  '[data-slot="selection"]',
  '[slot="selection"]',
  '.checkbox',
].join(',');

function flattenFolderRows<T extends FolderTableRow>(
  rows: T[],
  expandedKeys: Set<string>,
  depth = 0
): Array<FolderTableVisibleRow & T> {
  const result: Array<FolderTableVisibleRow & T> = [];

  for (const row of rows) {
    result.push({ ...row, depth });
    const hasChildren = Boolean(row.children?.length);
    if (
      (row.entryType === 'root' || row.entryType === 'folder') &&
      hasChildren &&
      expandedKeys.has(row.id)
    ) {
      result.push(...flattenFolderRows(row.children as T[], expandedKeys, depth + 1));
    }
  }

  return result;
}

function folderRowHasChildren(row: FolderTableRow): boolean {
  return (
    (row.entryType === 'root' || row.entryType === 'folder') &&
    (row.isExpandable === true || Boolean(row.children?.length))
  );
}

function resolveMaxBodyHeight(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

function evaluateRowPredicate<T>(
  predicate: boolean | ((row: T) => boolean) | undefined,
  row: T,
  defaultValue = true
): boolean {
  if (predicate === undefined) {
    return defaultValue;
  }
  return typeof predicate === 'function' ? predicate(row) : predicate;
}

function resolveRowActions<T extends FolderTableRow>(
  row: T,
  rowActions: FolderTableProps<T>['rowActions']
): FolderTableRowAction<T>[] {
  if (!rowActions) {
    return [];
  }
  return typeof rowActions === 'function' ? rowActions(row) : rowActions;
}

function toMenuActions<T extends FolderTableRow>(
  actions: FolderTableRowAction<T>[],
  row: T
): TableRowActionItem[] {
  return actions
    .filter((action) => evaluateRowPredicate(action.visible, row))
    .map((action) => ({
      key: action.key,
      label: action.label,
      variant: action.variant,
      disabled: evaluateRowPredicate(action.disabled, row, false),
    }));
}

function isPlainTextContent(content: ReactNode): content is string | number {
  return typeof content === 'string' || typeof content === 'number';
}

interface DelegatedRowTarget {
  row: HTMLElement;
  rowId: string;
}

function getDelegatedRowTarget(
  event: KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement> | PointerEvent<HTMLElement>
): DelegatedRowTarget | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }
  if (target.closest(INTERACTIVE_ROW_TARGET_SELECTOR)) {
    return null;
  }
  const row = target.closest<HTMLElement>(`[${ROW_ID_ATTRIBUTE}]`);
  if (!row || !event.currentTarget.contains(row)) {
    return null;
  }
  const rowId = row.getAttribute(ROW_ID_ATTRIBUTE);
  return rowId ? { row, rowId } : null;
}

function markImmediateSelectedRow(container: HTMLElement, selectedRow: HTMLElement) {
  const previousRows = container.querySelectorAll<HTMLElement>(
    `[${ROW_ID_ATTRIBUTE}][data-selected="true"], [${ROW_ID_ATTRIBUTE}][${IMMEDIATE_SELECTED_ATTRIBUTE}="true"]`
  );
  previousRows.forEach((row) => {
    if (row === selectedRow) {
      return;
    }
    row.removeAttribute('data-selected');
    row.removeAttribute(IMMEDIATE_SELECTED_ATTRIBUTE);
    row.classList.remove(styles.selectedRow);
  });

  selectedRow.setAttribute('data-selected', 'true');
  selectedRow.setAttribute(IMMEDIATE_SELECTED_ATTRIBUTE, 'true');
  selectedRow.classList.add(styles.selectedRow);
}

interface FolderTableBodyRowProps<T extends FolderTableRow> {
  columns: FolderTableColumn<T>[];
  isLoadMoreRow: boolean;
  isSelected: boolean;
  showBatchSelection: boolean;
  renderCellContent: (
    column: FolderTableColumn<T>,
    row: FolderTableVisibleRow & T,
    ctx: FolderTableRowContext<T>
  ) => ReactNode;
  resolveBodyCellClass: (column: FolderTableColumn<T>) => string;
  row: FolderTableVisibleRow & T;
}

function areBodyRowPropsEqual<T extends FolderTableRow>(
  prev: FolderTableBodyRowProps<T>,
  next: FolderTableBodyRowProps<T>
): boolean {
  return (
    prev.row === next.row &&
    prev.columns === next.columns &&
    prev.isLoadMoreRow === next.isLoadMoreRow &&
    prev.isSelected === next.isSelected &&
    prev.showBatchSelection === next.showBatchSelection &&
    prev.renderCellContent === next.renderCellContent &&
    prev.resolveBodyCellClass === next.resolveBodyCellClass
  );
}

function FolderTableBodyRowBase<T extends FolderTableRow>({
  columns,
  isLoadMoreRow,
  isSelected,
  showBatchSelection,
  renderCellContent,
  resolveBodyCellClass,
  row,
}: FolderTableBodyRowProps<T>) {
  const { t } = useTranslation('table');
  const rowId = row.id;
  const ctx: FolderTableRowContext<T> = {
    row,
    rowId,
    depth: row.depth,
  };

  return (
    <Table.Row
      id={rowId}
      textValue={row.name}
      data-folder-row-id={rowId}
      data-selected={isSelected ? 'true' : undefined}
      className={joinClassNames(
        styles.bodyRow,
        isSelected ? styles.selectedRow : undefined,
        isLoadMoreRow ? styles.inlineLoadMoreRow : undefined
      )}
    >
      {showBatchSelection ? (
        <Table.Cell className={joinClassNames(styles.checkboxCell, tableStyles.colCheckbox)}>
          <div
            className={joinClassNames(
              tableCellStyles.cellContentHostCenter,
              styles.checkboxCellInner
            )}
          >
            <TableSelectionCheckbox ariaLabel={t('aria.selectRow', { id: rowId })} />
          </div>
        </Table.Cell>
      ) : null}
      {columns.map((column) => {
        const cellContent = renderCellContent(column, row, ctx);
        return (
          <Table.Cell key={column.id} className={resolveBodyCellClass(column)}>
            <TableCellAlign
              align={column.isActionColumn ? 'center' : resolveColumnAlign(column.align)}
              stretch={shouldStretchTableCellContent(column)}
            >
              {column.isNameColumn || column.isActionColumn ? (
                cellContent
              ) : isPlainTextContent(cellContent) ? (
                <TableTextCell muted>{cellContent}</TableTextCell>
              ) : (
                cellContent
              )}
            </TableCellAlign>
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}

const FolderTableBodyRow = memo(
  FolderTableBodyRowBase,
  areBodyRowPropsEqual
) as typeof FolderTableBodyRowBase;

function FolderTable<T extends FolderTableRow>({
  ariaLabel,
  items,
  columns: columnsProp,
  loading = false,
  breadcrumb,
  toolbar,
  expandedRowKeys = [],
  onExpandedChange,
  selectedRowKey,
  onRowSelect,
  onRowActivate,
  rowActions,
  loadMore,
  totalCount,
  summary,
  maxBodyHeight,
  emptyText,
  emptyDescription,
  emptyIcon,
  skeletonRowCount = 4,
  className,
  sortDescriptor,
  onSortChange,
  batchSelection,
  batchFooter,
}: FolderTableProps<T>) {
  const { t } = useTranslation('table');
  const resolvedEmptyText = emptyText ?? t('empty.folderEmpty');
  const resolvedEmptyDescription = emptyDescription ?? t('empty.folderDescription');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);

  const columns = useMemo(
    () => columnsProp ?? (createDefaultFolderColumns<T>(t) as FolderTableColumn<T>[]),
    [columnsProp, t]
  );
  const eqLayout = isFolderEqLayout(columns);
  const eqColumnCount = countFolderEqColumns(columns);

  const expandedKeySet = useMemo(() => new Set(expandedRowKeys), [expandedRowKeys]);

  const sortedItems = useMemo(
    () =>
      sortFolderTreeRows(
        items,
        columns,
        sortDescriptor,
        (row) => ({ row, rowId: row.id, depth: 0 }),
        { isPinnedLast: (row) => row.entryType === 'loading' }
      ),
    [columns, items, sortDescriptor]
  );

  const visibleRows = useMemo(
    () => flattenFolderRows(sortedItems, expandedKeySet),
    [sortedItems, expandedKeySet]
  );
  const visibleRowMap = useMemo(() => {
    const map = new Map<string, FolderTableVisibleRow & T>();
    for (const row of visibleRows) {
      map.set(row.id, row as FolderTableVisibleRow & T);
    }
    return map;
  }, [visibleRows]);

  const showSkeletonBody = loading && items.length === 0;
  const showEmptyState = !loading && visibleRows.length === 0;
  const showBatchSelection = Boolean(batchSelection);
  const selectableVisibleRowIds = useMemo(
    () => visibleRows.filter((row) => row.entryType !== 'loading').map((row) => row.id),
    [visibleRows]
  );
  const disabledKeys = useMemo(() => {
    if (!batchSelection) {
      return undefined;
    }
    const keys = new Set<string>();
    if (batchSelection.disabledKeys) {
      for (const key of batchSelection.disabledKeys) {
        keys.add(String(key));
      }
    }
    if (loadMore?.loading) {
      keys.add('__load_more');
    }
    return keys.size > 0 ? keys : undefined;
  }, [batchSelection, loadMore?.loading]);
  const selectableRowCount = selectableVisibleRowIds.length;
  const selectedCount = resolveSelectedCount(batchSelection?.selectedKeys, selectableRowCount);
  const showBatchFooter = Boolean(batchSelection && batchFooter);

  const defaultSummary = useMemo(() => {
    if (summary !== undefined) {
      return summary;
    }
    const count = totalCount ?? items.length;
    return count > 0 ? t('summary.totalItems', { count }) : t('summary.totalItemsZero');
  }, [summary, totalCount, items.length, t]);

  const showFooter = !showSkeletonBody && Boolean(defaultSummary) && !showBatchFooter;

  const handleBatchSelectionChange = useCallback(
    (keys: Selection) => {
      if (!batchSelection) {
        return;
      }
      if (keys === 'all') {
        batchSelection.onSelectionChange('all');
        return;
      }
      batchSelection.onSelectionChange(keys);
    },
    [batchSelection]
  );

  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!loadMore) {
        return;
      }

      if (!loadMore.loading) {
        loadMoreLockRef.current = false;
      }

      if (loadMore.loading || !loadMore.hasMore || loadMoreLockRef.current) {
        return;
      }

      const container = event.currentTarget;
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceToBottom > LOAD_MORE_THRESHOLD_PX) {
        return;
      }

      loadMoreLockRef.current = true;
      loadMore.onLoadMore();
    },
    [loadMore]
  );

  const scrollContainerProps = useMemo(() => {
    if (!maxBodyHeight) {
      return {};
    }
    const resolved = resolveMaxBodyHeight(maxBodyHeight);
    return {
      style: { maxHeight: resolved } as CSSProperties,
    };
  }, [maxBodyHeight]);

  const handleToggleExpand = useCallback(
    (rowId: string) => {
      if (!onExpandedChange) {
        return;
      }
      const next = expandedRowKeys.includes(rowId)
        ? expandedRowKeys.filter((key) => key !== rowId)
        : [...expandedRowKeys, rowId];
      onExpandedChange(next);
    },
    [expandedRowKeys, onExpandedChange]
  );

  const handleRowAction = useCallback(
    (row: T, actionKey: string) => {
      const matched = resolveRowActions(row, rowActions).find((action) => action.key === actionKey);
      matched?.onPress(row);
    },
    [rowActions]
  );

  const handleRowPress = useCallback(
    (row: T) => {
      if (batchSelection) {
        return;
      }
      if (onRowSelect) {
        onRowSelect(row);
        return;
      }
      onRowActivate?.(row);
    },
    [batchSelection, onRowActivate, onRowSelect]
  );

  const handleDelegatedRowPress = useCallback(
    (rowId: string) => {
      const row = visibleRowMap.get(rowId);
      if (!row) {
        return;
      }
      handleRowPress(row as T);
    },
    [handleRowPress, visibleRowMap]
  );

  const handleBodyClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) {
        return;
      }
      if (batchSelection) {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      if (onRowSelect) {
        markImmediateSelectedRow(event.currentTarget, target.row);
      }
      handleDelegatedRowPress(target.rowId);
    },
    [batchSelection, handleDelegatedRowPress, onRowSelect]
  );

  const handleBodyPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!onRowSelect || batchSelection) {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      markImmediateSelectedRow(event.currentTarget, target.row);
    },
    [batchSelection, onRowSelect]
  );

  const handleBodyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }
      if (batchSelection) {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      event.preventDefault();
      if (onRowSelect) {
        markImmediateSelectedRow(event.currentTarget, target.row);
      }
      handleDelegatedRowPress(target.rowId);
    },
    [batchSelection, handleDelegatedRowPress, onRowSelect]
  );

  const renderCellContent = useCallback(
    (column: FolderTableColumn<T>, row: FolderTableVisibleRow, ctx: FolderTableRowContext<T>) => {
      if (column.isNameColumn) {
        if (row.entryType === 'loading') {
          return <span className={styles.inlineLoadMoreButton}>{row.name || '正在加载...'}</span>;
        }

        const expandable = folderRowHasChildren(row);
        const expanded = expandedKeySet.has(row.id);
        return (
          <FolderTableNameCell
            row={row}
            depth={row.depth}
            expanded={expanded}
            expandable={expandable}
            onToggleExpand={
              expandable && onExpandedChange ? () => handleToggleExpand(row.id) : undefined
            }
          />
        );
      }

      if (column.isActionColumn) {
        const menuActions = toMenuActions(resolveRowActions(ctx.row, rowActions), ctx.row);
        if (row.entryType === 'loading' || menuActions.length === 0) {
          return null;
        }
        return (
          <TableRowActions
            actions={menuActions}
            onAction={(key) => handleRowAction(ctx.row, key)}
          />
        );
      }

      if (column.renderCell) {
        return column.renderCell(ctx.row, ctx);
      }

      return null;
    },
    [expandedKeySet, handleRowAction, handleToggleExpand, onExpandedChange, rowActions]
  );

  const resolveColumnHeaderClass = useCallback(
    (column: FolderTableColumn<T>) =>
      joinClassNames(
        resolveFolderColumnWidthClassForColumn(column, eqLayout),
        column.isNameColumn ? styles.nameColumnHeader : undefined,
        column.isActionColumn ? styles.actionColumnHeader : undefined,
        column.className
      ),
    [eqLayout]
  );

  const resolveHeaderAlign = useCallback(
    (column: FolderTableColumn<T>) =>
      column.isActionColumn ? 'center' : resolveColumnAlign(column.align),
    []
  );

  const resolveBodyCellClass = useCallback(
    (column: FolderTableColumn<T>) =>
      joinClassNames(
        resolveFolderColumnWidthClassForColumn(column, eqLayout),
        column.isActionColumn ? styles.actionCell : styles.bodyCell,
        !column.isNameColumn && !column.isActionColumn ? styles.mutedCell : undefined,
        column.className
      ),
    [eqLayout]
  );

  return (
    <div className={joinClassNames(styles.shell, className)}>
      {breadcrumb || toolbar ? (
        <div className={styles.headerBar}>
          {breadcrumb ? (
            <div className={styles.breadcrumb}>{breadcrumb}</div>
          ) : (
            <div className={styles.headerBarSpacer} aria-hidden />
          )}
          {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
        </div>
      ) : null}

      <Table variant="secondary" className={styles.tableRoot}>
        <Table.ScrollContainer
          ref={scrollRef}
          className={styles.scrollContainer}
          onClick={showBatchSelection ? undefined : handleBodyClick}
          onKeyDown={showBatchSelection ? undefined : handleBodyKeyDown}
          onPointerDown={showBatchSelection ? undefined : handleBodyPointerDown}
          {...scrollContainerProps}
        >
          {showEmptyState ? (
            <div className={styles.emptyStateOverlay}>
              <TableBodyState
                title={resolvedEmptyText}
                description={resolvedEmptyDescription}
                icon={emptyIcon ?? <Folder size={20} aria-hidden />}
              />
            </div>
          ) : null}
          <Table.Content
            aria-label={ariaLabel}
            className={styles.tableContent}
            data-eq-count={eqColumnCount}
            data-has-selection={batchSelection ? 'true' : undefined}
            selectionMode={batchSelection ? 'multiple' : undefined}
            selectedKeys={batchSelection?.selectedKeys}
            onSelectionChange={batchSelection ? handleBatchSelectionChange : undefined}
            disabledKeys={disabledKeys}
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
          >
            <Table.Header>
              {batchSelection ? (
                <Table.Column
                  className={joinClassNames(styles.checkboxColumn, tableStyles.colCheckbox)}
                  id="__selection"
                >
                  <div
                    className={joinClassNames(
                      tableCellStyles.cellContentHostCenter,
                      styles.checkboxColumnInner
                    )}
                  >
                    <TableSelectionCheckbox ariaLabel={t('aria.selectAll')} />
                  </div>
                </Table.Column>
              ) : null}
              {columns.map((column) => (
                <Table.Column
                  key={column.id}
                  id={column.id}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.isRowHeader ?? column.isNameColumn}
                  className={resolveColumnHeaderClass(column)}
                >
                  <TableCellAlign align={resolveHeaderAlign(column)}>
                    {renderSortableColumnLabel(
                      column.label,
                      column.id,
                      sortDescriptor,
                      column.allowsSorting
                    )}
                  </TableCellAlign>
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body onScroll={handleScroll}>
              {showSkeletonBody ? (
                <FolderTableLoadingSkeleton
                  rowCount={skeletonRowCount}
                  columns={columns}
                  eqLayout={eqLayout}
                />
              ) : (
                <>
                  {visibleRows.map((row) => {
                    const rowId = row.id;
                    const isLoadMoreRow = row.entryType === 'loading';
                    const isSelected = selectedRowKey === rowId;

                    return (
                      <FolderTableBodyRow
                        key={rowId}
                        columns={columns}
                        isLoadMoreRow={isLoadMoreRow}
                        isSelected={isSelected}
                        showBatchSelection={showBatchSelection}
                        renderCellContent={renderCellContent}
                        resolveBodyCellClass={resolveBodyCellClass}
                        row={row as FolderTableVisibleRow & T}
                      />
                    );
                  })}
                  {loadMore?.loading ? (
                    <Table.Row
                      id="__load_more"
                      textValue={t('loadMoreRow')}
                      className={styles.loadMoreTableRow}
                    >
                      <Table.Cell
                        colSpan={columns.length + (showBatchSelection ? 1 : 0)}
                        className={joinClassNames(styles.loadMoreCell, styles.bodyCell)}
                      >
                        <TableLoadMoreRow />
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>

        {showBatchFooter ? (
          <TableBatchFooter selectedCount={selectedCount} className={styles.tableFooter}>
            {batchFooter}
          </TableBatchFooter>
        ) : showFooter ? (
          <TableSummaryFooter summary={defaultSummary} className={styles.tableFooter} />
        ) : null}
      </Table>
    </div>
  );
}

const MemoizedFolderTable = memo(FolderTable) as typeof FolderTable;

export default MemoizedFolderTable;

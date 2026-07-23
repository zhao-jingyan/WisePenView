import TableBatchFooter from '../ManageTable/parts/BatchFooter';
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
import { sortFolderTreeRows } from '../shared/TableBase/tableSort';
import TableBodyState from '../shared/TableBodyState';
import TableRowActions from '../shared/TableRowActions';
import type { TableRowActionItem } from '../shared/TableRowActions/index.type';
import TableSelectionCheckbox from '../shared/TableSelectionCheckbox';
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
  type ReactNode,
  type UIEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

const LOAD_MORE_THRESHOLD_PX = 48;
const ROW_ID_ATTRIBUTE = 'data-folder-row-id';
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
  event: KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>
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

interface FolderTableBodyRowProps<T extends FolderTableRow> {
  columns: FolderTableColumn<T>[];
  checkboxDisabled: boolean;
  checkboxHidden: boolean;
  onCheckboxChange: (rowId: string, selected: boolean, shiftKey: boolean) => void;
  isLoadMoreRow: boolean;
  isCheckboxSelected: boolean;
  isSelected: boolean;
  showCheckboxSelection: boolean;
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
    prev.checkboxDisabled === next.checkboxDisabled &&
    prev.checkboxHidden === next.checkboxHidden &&
    prev.onCheckboxChange === next.onCheckboxChange &&
    prev.isLoadMoreRow === next.isLoadMoreRow &&
    prev.isCheckboxSelected === next.isCheckboxSelected &&
    prev.isSelected === next.isSelected &&
    prev.showCheckboxSelection === next.showCheckboxSelection &&
    prev.renderCellContent === next.renderCellContent &&
    prev.resolveBodyCellClass === next.resolveBodyCellClass
  );
}

function FolderTableBodyRowBase<T extends FolderTableRow>({
  columns,
  checkboxDisabled,
  checkboxHidden,
  onCheckboxChange,
  isLoadMoreRow,
  isCheckboxSelected,
  isSelected,
  showCheckboxSelection,
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
      {showCheckboxSelection ? (
        <Table.Cell className={joinClassNames(styles.checkboxCell, tableStyles.colCheckbox)}>
          {!checkboxHidden ? (
            <div
              className={joinClassNames(
                tableCellStyles.cellContentHostCenter,
                styles.checkboxCellInner
              )}
            >
              <TableSelectionCheckbox
                ariaLabel={t('aria.selectRow', { id: rowId })}
                isSelected={isCheckboxSelected}
                isDisabled={checkboxDisabled}
                onChange={(selected, shiftKey) => onCheckboxChange(rowId, selected, shiftKey)}
              />
            </div>
          ) : null}
        </Table.Cell>
      ) : null}
      {columns.map((column) => {
        const cellContent = renderCellContent(column, row, ctx);
        return (
          <Table.Cell key={column.id} className={resolveBodyCellClass(column)}>
            <div className={styles.cellSurface}>
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
            </div>
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
  renderNameContent,
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
  isPinnedFirst,
  isEditMode = false,
  checkboxSelection,
  selectionFooter,
}: FolderTableProps<T>) {
  const { t } = useTranslation('table');
  const resolvedEmptyText = emptyText ?? t('empty.folderEmpty');
  const resolvedEmptyDescription = emptyDescription ?? t('empty.folderDescription');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);
  const selectionAnchorRef = useRef<string | undefined>(undefined);

  const columns = useMemo(
    () => columnsProp ?? (createDefaultFolderColumns<T>(t) as FolderTableColumn<T>[]),
    [columnsProp, t]
  );
  const eqLayout = isFolderEqLayout(columns);
  const eqColumnCount = countFolderEqColumns(columns);

  const expandedKeySet = useMemo(() => new Set(expandedRowKeys), [expandedRowKeys]);
  const selectedEditRowKeySet = useMemo(
    () => new Set(checkboxSelection ? [...checkboxSelection.selectedKeys].map(String) : []),
    [checkboxSelection]
  );
  const selectedRowKeySet = useMemo(
    () => (isEditMode ? selectedEditRowKeySet : new Set(selectedRowKey ? [selectedRowKey] : [])),
    [isEditMode, selectedEditRowKeySet, selectedRowKey]
  );

  const sortedItems = useMemo(
    () =>
      sortFolderTreeRows(
        items,
        columns,
        sortDescriptor,
        (row) => ({ row, rowId: row.id, depth: 0 }),
        {
          isPinnedFirst,
          isPinnedLast: (row) => row.entryType === 'loading',
        }
      ),
    [columns, isPinnedFirst, items, sortDescriptor]
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
  const showCheckboxSelection = Boolean(checkboxSelection);
  const disabledKeys = useMemo(() => {
    const keys = new Set<string>();
    if (checkboxSelection?.disabledKeys) {
      for (const key of checkboxSelection.disabledKeys) {
        keys.add(String(key));
      }
    }
    return keys;
  }, [checkboxSelection]);
  const hiddenKeys = useMemo(() => {
    const keys = new Set<string>();
    if (checkboxSelection?.hiddenKeys) {
      for (const key of checkboxSelection.hiddenKeys) {
        keys.add(String(key));
      }
    }
    return keys;
  }, [checkboxSelection]);
  const selectableVisibleRowIds = useMemo(
    () =>
      visibleRows
        .filter(
          (row) =>
            row.entryType !== 'loading' && !disabledKeys.has(row.id) && !hiddenKeys.has(row.id)
        )
        .map((row) => row.id),
    [disabledKeys, hiddenKeys, visibleRows]
  );
  const selectedVisibleCount = selectableVisibleRowIds.filter((id) =>
    selectedRowKeySet.has(id)
  ).length;
  const allVisibleSelected =
    selectableVisibleRowIds.length > 0 && selectedVisibleCount === selectableVisibleRowIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const showSelectionFooter = Boolean(checkboxSelection && selectionFooter);

  const defaultSummary = useMemo(() => {
    if (summary !== undefined) {
      return summary;
    }
    const count = totalCount ?? items.length;
    return count > 0 ? t('summary.totalItems', { count }) : t('summary.totalItemsZero');
  }, [summary, totalCount, items.length, t]);

  const showFooter = !showSkeletonBody && Boolean(defaultSummary) && !showSelectionFooter;

  const handleCheckboxChange = useCallback(
    (rowId: string, selected: boolean, shiftKey: boolean) => {
      if (
        !checkboxSelection ||
        disabledKeys.has(rowId) ||
        hiddenKeys.has(rowId) ||
        !selectableVisibleRowIds.includes(rowId)
      ) {
        return;
      }

      const nextKeys = new Set(selectedEditRowKeySet);
      const anchorId = selectionAnchorRef.current;
      const anchorIndex = anchorId ? selectableVisibleRowIds.indexOf(anchorId) : -1;
      const rowIndex = selectableVisibleRowIds.indexOf(rowId);

      if (shiftKey && anchorIndex >= 0 && rowIndex >= 0) {
        const start = Math.min(anchorIndex, rowIndex);
        const end = Math.max(anchorIndex, rowIndex);
        selectableVisibleRowIds.slice(start, end + 1).forEach((id) => {
          if (selected) {
            nextKeys.add(id);
          } else {
            nextKeys.delete(id);
          }
        });
      } else if (selected) {
        nextKeys.add(rowId);
      } else {
        nextKeys.delete(rowId);
      }

      selectionAnchorRef.current = rowId;
      checkboxSelection.onSelectionChange(nextKeys);
    },
    [checkboxSelection, disabledKeys, hiddenKeys, selectableVisibleRowIds, selectedEditRowKeySet]
  );

  const handleToggleAll = useCallback(() => {
    if (!checkboxSelection) {
      return;
    }
    const nextKeys = new Set(selectedEditRowKeySet);
    selectableVisibleRowIds.forEach((id) => {
      if (allVisibleSelected) {
        nextKeys.delete(id);
      } else {
        nextKeys.add(id);
      }
    });
    selectionAnchorRef.current = undefined;
    checkboxSelection.onSelectionChange(nextKeys);
  }, [allVisibleSelected, checkboxSelection, selectableVisibleRowIds, selectedEditRowKeySet]);

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
      const isCollapsing = expandedRowKeys.includes(rowId);
      if (isCollapsing && checkboxSelection) {
        const rowIndex = visibleRows.findIndex((row) => row.id === rowId);
        const rowDepth = visibleRows[rowIndex]?.depth;
        if (rowIndex >= 0 && rowDepth !== undefined) {
          const descendantIds = new Set<string>();
          for (let index = rowIndex + 1; index < visibleRows.length; index += 1) {
            const row = visibleRows[index];
            if (row.depth <= rowDepth) break;
            descendantIds.add(row.id);
          }
          if (descendantIds.size > 0) {
            const nextSelectedKeys = new Set(selectedEditRowKeySet);
            let selectionChanged = false;
            descendantIds.forEach((id) => {
              selectionChanged = nextSelectedKeys.delete(id) || selectionChanged;
            });
            if (selectionAnchorRef.current && descendantIds.has(selectionAnchorRef.current)) {
              selectionAnchorRef.current = undefined;
            }
            if (selectionChanged) {
              checkboxSelection.onSelectionChange(nextSelectedKeys);
            }
          }
        }
      }
      const next = isCollapsing
        ? expandedRowKeys.filter((key) => key !== rowId)
        : [...expandedRowKeys, rowId];
      onExpandedChange(next);
    },
    [checkboxSelection, expandedRowKeys, onExpandedChange, selectedEditRowKeySet, visibleRows]
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
      if (onRowSelect) {
        onRowSelect(row);
        return;
      }
      onRowActivate?.(row);
    },
    [onRowActivate, onRowSelect]
  );

  const handleDelegatedRowPress = useCallback(
    (rowId: string, shiftKey: boolean) => {
      const row = visibleRowMap.get(rowId);
      if (!row) {
        return;
      }
      if (isEditMode) {
        handleCheckboxChange(rowId, !selectedEditRowKeySet.has(rowId), shiftKey);
        return;
      }
      handleRowPress(row as T);
    },
    [handleCheckboxChange, handleRowPress, isEditMode, selectedEditRowKeySet, visibleRowMap]
  );

  const handleBodyClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      handleDelegatedRowPress(target.rowId, event.shiftKey);
    },
    [handleDelegatedRowPress]
  );

  const handleBodyDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || isEditMode || !onRowSelect) {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      const row = visibleRowMap.get(target.rowId);
      if (row) {
        onRowActivate?.(row as T);
      }
    },
    [isEditMode, onRowActivate, onRowSelect, visibleRowMap]
  );

  const handleBodyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const target = getDelegatedRowTarget(event);
      if (!target) {
        return;
      }
      event.preventDefault();
      handleDelegatedRowPress(target.rowId, event.shiftKey);
    },
    [handleDelegatedRowPress]
  );

  const renderCellContent = useCallback(
    (
      column: FolderTableColumn<T>,
      row: FolderTableVisibleRow & T,
      ctx: FolderTableRowContext<T>
    ) => {
      if (column.isNameColumn) {
        if (row.entryType === 'loading') {
          return <span className={styles.inlineLoadMoreButton}>{row.name || '正在加载...'}</span>;
        }

        const expandable = folderRowHasChildren(row);
        const expanded = expandedKeySet.has(row.id);
        return (
          <FolderTableNameCell<T>
            row={row}
            depth={row.depth}
            expanded={expanded}
            expandable={expandable}
            renderNameContent={renderNameContent}
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
    [
      expandedKeySet,
      handleRowAction,
      handleToggleExpand,
      onExpandedChange,
      renderNameContent,
      rowActions,
    ]
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
        column.isNameColumn ? styles.nameCell : undefined,
        !column.isNameColumn && !column.isActionColumn ? styles.mutedCell : undefined,
        column.className
      ),
    [eqLayout]
  );

  return (
    <div
      className={joinClassNames(styles.shell, className)}
      data-edit-mode={isEditMode ? 'true' : undefined}
    >
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
          onClick={handleBodyClick}
          onDoubleClick={handleBodyDoubleClick}
          onKeyDown={handleBodyKeyDown}
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
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
          >
            <Table.Header>
              {checkboxSelection ? (
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
                    {isEditMode ? (
                      <TableSelectionCheckbox
                        ariaLabel={t('aria.selectAll')}
                        isSelected={allVisibleSelected}
                        isIndeterminate={someVisibleSelected}
                        isDisabled={selectableVisibleRowIds.length === 0}
                        onChange={() => handleToggleAll()}
                      />
                    ) : null}
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
                  showCheckboxSelection={showCheckboxSelection}
                />
              ) : (
                <>
                  {visibleRows.map((row) => {
                    const rowId = row.id;
                    const isLoadMoreRow = row.entryType === 'loading';
                    const isSelected = selectedRowKeySet.has(rowId);
                    const isCheckboxSelected = selectedEditRowKeySet.has(rowId);

                    return (
                      <FolderTableBodyRow
                        key={rowId}
                        columns={columns}
                        checkboxDisabled={isLoadMoreRow || disabledKeys.has(rowId)}
                        checkboxHidden={hiddenKeys.has(rowId)}
                        onCheckboxChange={handleCheckboxChange}
                        isLoadMoreRow={isLoadMoreRow}
                        isCheckboxSelected={isCheckboxSelected}
                        isSelected={isSelected}
                        showCheckboxSelection={showCheckboxSelection}
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
                        colSpan={columns.length + (showCheckboxSelection ? 1 : 0)}
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

        {showSelectionFooter ? (
          <TableBatchFooter selectedCount={selectedRowKeySet.size}>
            {selectionFooter}
          </TableBatchFooter>
        ) : showFooter ? (
          <TableSummaryFooter summary={defaultSummary} />
        ) : null}
      </Table>
    </div>
  );
}

const MemoizedFolderTable = memo(FolderTable) as typeof FolderTable;

export default MemoizedFolderTable;

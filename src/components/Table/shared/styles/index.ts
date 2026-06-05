import tableCellStylesModule from './cells.module.less';
import tableStylesModule from './table.module.less';

/** Table 共享样式模块（token、列宽、Popover 圆角类名） */
export const tableStyles = tableStylesModule;

/** 单元格内容辅助类（继承 .table__cell 字号，仅语义色/截断） */
export const tableCellStyles = tableCellStylesModule;

/** Select.Popover 圆角，与 trigger 一致 */
export const TABLE_SELECT_POPOVER_CLASS = tableStylesModule.selectPopover;

/** Dropdown.Popover 圆角，与 trigger 一致 */
export const TABLE_DROPDOWN_POPOVER_CLASS = tableStylesModule.dropdownPopover;
